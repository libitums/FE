// 추천 답변 칩 만들기 — 모델 호출(후보 셋) · 후보마다 검증(`checkCandidates`) · 미성년자 · 나이 모름의 출력 검사 · 의도가 다른 것 고르기
// (`pickShown`) · 통과한 후보가 하나도 없을 때만 한 번 다시 묻기. `companion-suggest`(다시 만들기 · 자동 생성이 실패한 턴) · `chat-send`
// (스위치가 켜졌을 때 매 턴, `chat-send-suggest.ts`) · `companion-greet`(첫 인사)가 같이 씁니다.

import type { AgeBand, ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import type { ReplySuggestion } from "./companion-contract/index.ts";
import type { SuggestRequest, SuggestionDraft } from "./companion-suggest.contract.ts";
import type { Outbound } from "./delete-account.contract.ts";
import { containsExpression } from "./companion-learning-match.ts";
import { callRpc } from "./companion-rpc.ts";
import { type CandidateRecord, checkCandidates, pickShown } from "./companion-suggest-select.ts";

type UnavailableReason = "generation_failed" | "blocked" | "no_valid_candidates";
type UnavailableOutcome =
  | "generation_failed"
  | "timeout"
  | "moderation_failed"
  | "blocked"
  | "no_valid_candidates";

/**
 * `ok`면 보일 칩(1 ~ `displayMax`개). 아니면 응답의 이유(`reason`)와 로그 · meta에 남길 자세한 까닭(`outcome`). 둘 다 마지막으로 받은 후보와
 * 검사 결과(`candidates`, 모델이 아무것도 못 냈으면 빈 배열) · 걸린 시간(`ms`)을 싣는다.
 */
export type SuggestOutcome = {
  readonly candidates: CandidateRecord[];
  readonly ms: number;
  /** 학습 표현을 넣은 칩이 보였는가(칩 방식일 때만 — 요청에 `target`이 있을 때). */
  readonly targetShown?: boolean;
} & (
  | { readonly status: "ok"; readonly items: ReplySuggestion[] }
  | {
      readonly status: "unavailable";
      readonly reason: UnavailableReason;
      readonly outcome: UnavailableOutcome;
    }
);

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

/**
 * 칩을 만듭니다. 거부하지 않습니다 — 실패는 `unavailable`입니다.
 * - `timeoutMs`: 모델 호출 한 번 · 출력 검사 한 번의 제한 시간.
 * - `budgetMs`: 있으면 전체(다시 묻기 · 출력 검사 포함)를 이 안에 끝냅니다. 다시 묻기는 예산의 1/3 이상 남았을 때만 합니다.
 * - `displayMax`: 보일 칩의 최대 수(`settings.suggestion_display_max`).
 * 구조화 출력이 깨지거나(거절 · 모양 오류) 통과한 후보가 하나도 없으면 한 번만 다시 묻습니다. 시간 초과는 다시 물어도 늦기만 해서
 * 다시 묻지 않습니다.
 */
export async function generateSuggestions(
  llm: CompanionLlm,
  input: {
    readonly request: Omit<SuggestRequest, "signal">;
    readonly ageBand: AgeBand;
    readonly timeoutMs: number;
    readonly budgetMs?: number;
    readonly displayMax: number;
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
  let candidates: CandidateRecord[] = [];
  const unavailable = (reason: UnavailableReason, outcome: UnavailableOutcome): SuggestOutcome => ({
    status: "unavailable",
    reason,
    outcome,
    candidates,
    ms: Date.now() - started,
  });

  let parsed = false;
  let timedOut = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0 && left() < Math.max(retryFloorMs, 1)) break;
    try {
      const drafts: SuggestionDraft[] = await withTimeout(
        left(),
        (callSignal) => llm.suggest({ ...input.request, signal: callSignal }),
        signal,
      );
      parsed = true;
      candidates = checkCandidates(drafts, input.request.l1, input.request.recentChoiceSets);
      if (candidates.some((candidate) => !candidate.reason)) break;
    } catch (error) {
      if (error instanceof Timeout) timedOut = true;
      if (timedOut || signal?.aborted) break;
    }
  }
  const valid = candidates.filter((candidate) => !candidate.reason);
  if (valid.length === 0) {
    if (parsed && !timedOut) return unavailable("no_valid_candidates", "no_valid_candidates");
    return unavailable("generation_failed", timedOut ? "timeout" : "generation_failed");
  }

  // 답과 같은 규칙입니다 — 출력 동기 검사는 미성년자 · 나이 모름에만 돌고, 성인은 프롬프트의 금지 규칙에 기댑니다.
  // 통과한 후보를 한 번에 검사하고, 걸리면 모두 뺍니다. 검사가 실패해도 검사하지 않은 칩을 내보내지 않습니다.
  if (input.ageBand !== "adult") {
    const ms = left();
    if (ms <= 0) return unavailable("generation_failed", "timeout");
    const verdict = await withTimeout(
      ms,
      (callSignal) =>
        llm.moderate({
          layer: "output_sync",
          text: valid.map((item) => item.text).join("\n"),
          context: null,
          ageBand: input.ageBand,
          signal: callSignal,
        }),
      signal,
    ).catch(() => null);
    if (verdict === null) return unavailable("generation_failed", "moderation_failed");
    if (verdict.action !== "allow") {
      candidates = candidates.map((candidate) =>
        candidate.reason ? candidate : { ...candidate, reason: "blocked" },
      );
      return unavailable("blocked", "blocked");
    }
  }
  const target = input.request.target ?? null;
  const keep =
    target === null
      ? -1
      : candidates.findIndex(
          (candidate) => !candidate.reason && containsExpression(target, candidate.text),
        );
  const picked = pickShown(candidates, input.displayMax, keep < 0 ? null : keep);
  return {
    status: "ok",
    items: picked.items,
    candidates: picked.candidates,
    ms: Date.now() - started,
    ...(target === null ? {} : { targetShown: keep >= 0 && picked.candidates[keep]!.shown }),
  };
}

/** 저장 모양(2판) — 메시지 목록은 `items`만 준다. `candidates`는 평가 · 지표용, `outcome`은 다음 유저 말이 오면 붙는다. */
export function suggestionRecord(saved: {
  readonly items: readonly ReplySuggestion[];
  readonly candidates: readonly CandidateRecord[];
  readonly ms: number;
  readonly model: string;
  readonly createdAt: string;
  readonly playground: boolean;
}) {
  return {
    version: 2,
    items: saved.items,
    candidates: saved.candidates,
    model: saved.model,
    createdAt: saved.createdAt,
    ms: saved.ms,
    ...(saved.playground ? { playground: true } : {}),
  };
}

/**
 * 칩을 그 캐릭터 메시지의 `messages.suggestions`에 저장합니다(`suggestionRecord` — `companion-suggest`의 캐시이자 메시지 목록의
 * `suggestions`). 실패하면 false — 칩을 막지 않습니다(다음에 `companion-suggest`가 다시 만들 뿐입니다).
 */
export async function saveSuggestions(
  outbound: Outbound,
  env: ChatSendEnv,
  saved: {
    readonly userId: string;
    readonly messageId: string;
    readonly items: readonly ReplySuggestion[];
    readonly candidates: readonly CandidateRecord[];
    readonly ms: number;
    readonly model: string;
    readonly createdAt: string;
    readonly playground: boolean;
  },
): Promise<boolean> {
  try {
    await callRpc(outbound, env, "companion_save_suggestions", {
      p_user_id: saved.userId,
      p_message_id: saved.messageId,
      p_suggestions: suggestionRecord(saved),
    });
    return true;
  } catch {
    return false;
  }
}
