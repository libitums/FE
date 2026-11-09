// 추천 답변 칩 만들기 — 모델 호출 · 검사(`suggestionsFrom`) · 한 번 다시 묻기 · 미성년자 · 나이 모름의 출력 검사.
// `companion-suggest`(다시 만들기 · 자동 생성이 실패한 턴)와 `chat-send`(스위치가 켜졌을 때 매 턴, `chat-send-suggest.ts`)가 같이 씁니다.

import type { AgeBand, ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import type { ReplySuggestion } from "./companion-contract/index.ts";
import type { SuggestRequest, SuggestionDraft } from "./companion-suggest.contract.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { suggestionsFrom } from "./companion-llm-prompts.ts";
import { callRpc } from "./companion-rpc.ts";

/** `ok`면 칩 셋. 아니면 응답의 이유(`reason`)와 로그에 남길 자세한 까닭(`outcome`). */
export type SuggestOutcome =
  | { readonly status: "ok"; readonly items: ReplySuggestion[] }
  | {
      readonly status: "unavailable";
      readonly reason: "generation_failed" | "blocked";
      readonly outcome: "generation_failed" | "timeout" | "moderation_failed" | "blocked";
    };

export class Timeout extends Error {}

/** 구현이 신호를 따르지 않아도 제한 시간에 끝나게 타이머와 겨룹니다. `outer`가 끊기면 호출도 끊깁니다. */
export async function withTimeout<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
  outer?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(outer === undefined ? controller.signal : AbortSignal.any([controller.signal, outer])),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Timeout());
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const unavailable = (
  reason: "generation_failed" | "blocked",
  outcome: Extract<SuggestOutcome, { status: "unavailable" }>["outcome"],
): SuggestOutcome => ({ status: "unavailable", reason, outcome });

/**
 * 칩을 만듭니다. 거부하지 않습니다 — 실패는 `unavailable`입니다.
 * - `timeoutMs`: 모델 호출 한 번 · 출력 검사 한 번의 제한 시간.
 * - `budgetMs`: 있으면 전체(다시 묻기 · 출력 검사 포함)를 이 안에 끝냅니다. 다시 묻기는 예산의 1/3 이상 남았을 때만 합니다.
 * 구조화 출력이 깨지거나(거절 · 모양 오류) 검사를 못 지나면 한 번만 다시 묻습니다. 시간 초과는 다시 물어도 늦기만 해서 다시 묻지 않습니다.
 */
export async function generateSuggestions(
  llm: CompanionLlm,
  input: {
    readonly request: Omit<SuggestRequest, "signal">;
    readonly ageBand: AgeBand;
    readonly timeoutMs: number;
    readonly budgetMs?: number;
    readonly signal?: AbortSignal;
  },
): Promise<SuggestOutcome> {
  const started = Date.now();
  const { budgetMs, signal } = input;
  const left = () =>
    budgetMs === undefined
      ? input.timeoutMs
      : Math.min(input.timeoutMs, budgetMs - (Date.now() - started));
  const retryFloorMs = budgetMs === undefined ? 0 : budgetMs / 3;

  let items: ReplySuggestion[] | null = null;
  let timedOut = false;
  for (let attempt = 0; attempt < 2 && items === null; attempt += 1) {
    if (attempt > 0 && left() < Math.max(retryFloorMs, 1)) break;
    try {
      const drafts: SuggestionDraft[] = await withTimeout(
        left(),
        (callSignal) => llm.suggest({ ...input.request, signal: callSignal }),
        signal,
      );
      items = suggestionsFrom(drafts, input.request.l1);
    } catch (error) {
      if (error instanceof Timeout) timedOut = true;
      if (timedOut || signal?.aborted) break;
    }
  }
  if (items === null)
    return unavailable("generation_failed", timedOut ? "timeout" : "generation_failed");

  // 답과 같은 규칙입니다 — 출력 동기 검사는 미성년자 · 나이 모름에만 돌고, 성인은 프롬프트의 금지 규칙에 기댑니다.
  // 검사가 실패해도 검사하지 않은 칩을 내보내지 않습니다.
  if (input.ageBand !== "adult") {
    const ms = left();
    if (ms <= 0) return unavailable("generation_failed", "timeout");
    const text = items.map((item) => item.text).join("\n");
    const verdict = await withTimeout(
      ms,
      (callSignal) =>
        llm.moderate({
          layer: "output_sync",
          text,
          context: null,
          ageBand: input.ageBand,
          signal: callSignal,
        }),
      signal,
    ).catch(() => null);
    if (verdict === null) return unavailable("generation_failed", "moderation_failed");
    if (verdict.action !== "allow") return unavailable("blocked", "blocked");
  }
  return { status: "ok", items };
}

/**
 * 칩을 그 캐릭터 메시지의 `messages.suggestions`에 저장합니다(`{items, model, createdAt, playground?}` — `companion-suggest`의 캐시이자
 * 메시지 목록의 `suggestions`). 실패하면 false — 칩을 막지 않습니다(다음에 `companion-suggest`가 다시 만들 뿐입니다).
 */
export async function saveSuggestions(
  outbound: Outbound,
  env: ChatSendEnv,
  saved: {
    readonly userId: string;
    readonly messageId: string;
    readonly items: readonly ReplySuggestion[];
    readonly model: string;
    readonly createdAt: string;
    readonly playground: boolean;
  },
): Promise<boolean> {
  try {
    await callRpc(outbound, env, "companion_save_suggestions", {
      p_user_id: saved.userId,
      p_message_id: saved.messageId,
      p_suggestions: {
        items: saved.items,
        model: saved.model,
        createdAt: saved.createdAt,
        ...(saved.playground ? { playground: true } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}
