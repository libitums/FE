// 턴 하나의 SSE 이벤트를 접는 리듀서입니다(ADR-0137) — 순수. 모르는 · 틀린 이벤트는 그대로 버립니다.
// 서버 순서(API §4.3): start → notice* → delta* → correction · translation* · suggestions → state → done(또는 error · crisis).

import type { ChatCorrection } from "./chat-feedback.contract";
import type { RemoteSendFailure } from "./chat-remote.contract";
import type { ChatCrisisResource, ChatNoticeKind, ChatReplyIdea } from "./chat-source.contract";
import { correctionOf, crisisOf, ideasOf, noticeKindOf, segmentText } from "./companion-parse";

export type TurnBubble = { readonly ko: string; readonly en: string };
/** 서버 말풍선 원본(말 · 행동 구분과 번역) — 보이는 값(`bubbles`)은 여기서 만듭니다. */
export type TurnSegment = {
  readonly kind: string;
  readonly text: string;
  readonly translation: string;
};

export type TurnState = {
  readonly userMessageId: string | null;
  readonly assistantMessageId: string | null;
  readonly segments: readonly TurnSegment[];
  readonly bubbles: readonly TurnBubble[];
  readonly notices: readonly ChatNoticeKind[];
  readonly correction: { readonly userMessageId: string; readonly card: ChatCorrection } | null;
  readonly ideas: readonly ChatReplyIdea[] | null;
  readonly crisis: readonly ChatCrisisResource[] | null;
  readonly finished: boolean;
  readonly failure: RemoteSendFailure | null;
};

export const initialTurnState: TurnState = {
  userMessageId: null,
  assistantMessageId: null,
  segments: [],
  bubbles: [],
  notices: [],
  correction: null,
  ideas: null,
  crisis: null,
  finished: false,
  failure: null,
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const dataOf = (text: string): Record<string, unknown> | null => {
  try {
    return recordOf(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
};
const indexOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 64 ? value : null;

const withSegments = (state: TurnState, segments: readonly TurnSegment[]): TurnState => ({
  ...state,
  segments,
  bubbles: segments.map(segmentText),
});

export function applyTurnEvent(state: TurnState, event: string, data: string): TurnState {
  if (state.finished) return state;
  const payload = dataOf(data);
  if (payload === null) return state;
  switch (event) {
    case "start": {
      const userMessageId =
        typeof payload.userMessageId === "string" ? payload.userMessageId : null;
      const assistantMessageId =
        typeof payload.assistantMessageId === "string" ? payload.assistantMessageId : null;
      return userMessageId === null || assistantMessageId === null
        ? state
        : { ...state, userMessageId, assistantMessageId };
    }
    case "notice": {
      const kind = noticeKindOf(payload.kind);
      return kind === null ? state : { ...state, notices: [...state.notices, kind] };
    }
    case "delta": {
      const index = indexOf(payload.segment);
      if (index === null || typeof payload.text !== "string" || typeof payload.kind !== "string")
        return state;
      const segments = [...state.segments];
      while (segments.length <= index)
        segments.push({ kind: payload.kind, text: "", translation: "" });
      const current = segments[index] as TurnSegment;
      segments[index] = { ...current, kind: payload.kind, text: current.text + payload.text };
      return withSegments(state, segments);
    }
    case "translation": {
      const index = indexOf(payload.segment);
      const segments = [...state.segments];
      const current = index === null ? undefined : segments[index];
      if (index === null || current === undefined || typeof payload.text !== "string") return state;
      segments[index] = { ...current, translation: payload.text };
      return withSegments(state, segments);
    }
    case "correction": {
      const card = correctionOf(payload);
      const userMessageId =
        typeof payload.userMessageId === "string" ? payload.userMessageId : null;
      return card === null || userMessageId === null
        ? state
        : { ...state, correction: { userMessageId, card } };
    }
    case "suggestions": {
      if (payload.status !== "ok") return state;
      const ideas = ideasOf(payload.items);
      return ideas === null ? state : { ...state, ideas };
    }
    case "crisis": {
      const crisis = crisisOf(payload);
      return crisis === null ? state : { ...state, crisis };
    }
    case "error": {
      const code = typeof payload.code === "string" ? payload.code : "internal_error";
      return { ...state, finished: true, failure: { kind: "stream-error", code } };
    }
    case "done":
      return { ...state, finished: true };
    default:
      return state;
  }
}

/** 스트림이 끝났습니다. `done` 없이 끝났으면 넘긴 실패로 닫습니다. */
export function endTurn(state: TurnState, _reason: string, failure: RemoteSendFailure): TurnState {
  return state.finished ? state : { ...state, finished: true, failure };
}
