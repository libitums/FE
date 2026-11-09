// 턴마다 자동으로 만드는 추천 답변 칩(API §4 `suggestions`). Zeta처럼 유저가 켜고 끄는 스위치(`profiles.reply_suggestions`, 판정의
// `replySuggestions`)가 켜져 있을 때만 만들고, 꺼져 있으면 이벤트도 없습니다.
//
// 답 조각이 다 모인 뒤 번역과 같이 시작해 남은 기다림(피드백 · 미성년자 출력 검사 · 번역)과 동시에 돌립니다. 맥락은 턴이 이미 읽은 대화에
// 이번 유저 말과 새 답을 붙여 `companion-suggest`와 같은 모양(최근 6개 · 한 줄 500자 · 번역 없음)으로 다듬습니다. `translation` 뒤 ·
// `state` 앞에 한 번 보내고, `ok`면 저장(끝 뒤 `companion_save_suggestions`)합니다. 위기 · 차단 · 거절 턴은 이 길에 오지 않습니다.
// 실패 · 시간 초과(6초)는 턴을 실패시키지 않습니다 — `unavailable`을 보내고 앱이 `companion-suggest`로 대신 받습니다.

import type {
  AgeBand,
  BegunTurn,
  ChatSendDeps,
  CompanionLlm,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";
import { historyFrom } from "./chat-send-reply.ts";
import type { ReplySuggestion } from "./companion-contract/index.ts";
import { recentFeedbackHistory } from "./companion-llm-prompts.ts";
import { generateSuggestions, type SuggestOutcome } from "./companion-suggest-generate.ts";

/** 칩을 기다리는 시간(다시 묻기 · 출력 검사 포함). 번역과 같은 6초 — 넘으면 `unavailable`로 턴을 끝냅니다. */
export const defaultSuggestionTimeoutMs = 6_000;

type SuggestTurnContext = {
  readonly deps: ChatSendDeps;
  readonly llm: CompanionLlm;
  readonly body: { readonly text: string };
  readonly gate: {
    readonly replySuggestions?: boolean;
    readonly l1: string | null;
    readonly ageBand: AgeBand;
  };
  readonly turn: Pick<BegunTurn, "history" | "speechLevel">;
};

/** 스위치가 켜져 있으면 칩 만들기를 시작합니다(거부하지 않는 약속). 꺼져 있거나 판정이 스위치를 모르면(옛 DB) null — 이벤트가 없습니다. */
export function startSuggestions(
  context: SuggestTurnContext,
  persona: PersonaCard,
  segments: readonly Segment[],
  signal: AbortSignal,
): Promise<SuggestOutcome> | null {
  const { deps, body, gate, turn } = context;
  if (gate.replySuggestions !== true) return null;
  const budgetMs = deps.suggestionTimeoutMs ?? defaultSuggestionTimeoutMs;
  return generateSuggestions(context.llm, {
    request: {
      character: { name: persona.name, role: persona.role ?? null },
      speechLevel: turn.speechLevel,
      l1: gate.l1,
      history: recentFeedbackHistory([
        ...historyFrom(turn),
        { role: "user", text: body.text },
        { role: "assistant", segments: segments.map(({ kind, text }) => ({ kind, text })) },
      ]),
    },
    ageBand: gate.ageBand,
    timeoutMs: budgetMs,
    budgetMs,
    signal,
  });
}

/** `suggestions` 이벤트를 보냅니다(`translation` 뒤 · `state` 앞). 저장할 칩을 돌려줍니다 — 없으면 null. */
export function sendSuggestions(
  sink: Sink,
  log: ChatSendDeps["log"],
  messageId: string,
  outcome: SuggestOutcome | null,
): ReplySuggestion[] | null {
  if (outcome === null) return null;
  if (outcome.status === "ok") {
    sink.send({ event: "suggestions", data: { messageId, status: "ok", items: outcome.items } });
    return outcome.items;
  }
  sink.send({
    event: "suggestions",
    data: { messageId, status: "unavailable", items: [], reason: outcome.reason },
  });
  log({
    event: "chat_send",
    status: "stream",
    outcome: "suggestions_unavailable",
    error: outcome.outcome,
  });
  return null;
}

/** 저장 meta에 남기는 칩 결과 — 스위치가 꺼져 있으면 없습니다. */
export const suggestionsMeta = (outcome: SuggestOutcome | null) =>
  outcome === null ? undefined : outcome.status === "ok" ? "ok" : outcome.outcome;
