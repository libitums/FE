// 턴 하나의 SSE 이벤트를 접는 리듀서입니다(ADR-0137) — 순수. 모르는 · 틀린 이벤트는 그대로 버립니다.
// 서버 순서(API §4.3): start → notice* → delta* → correction · translation* · suggestions → state → done(또는 error · crisis).

import type { ChatCorrection, ChatWordsResult } from "./chat-feedback.contract";
import type { RemoteSendFailure } from "./chat-remote.contract";
import type { ChatCrisisResource, ChatNoticeKind, ChatReplyIdea } from "./chat-source.contract";
import { ideasRefOf, type ChatIdeasRef } from "./chat-suggestion-ref";
import { correctionOf, crisisOf, ideasOf, noticeKindOf, segmentText } from "./companion-parse";
import { chatWordsOf } from "./companion-chat-words";

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
  /** 이 글로 얻은 채팅 단어(ADR-0170) — `correction` 본문의 `chatWords`. */
  readonly chatWords: { readonly userMessageId: string; readonly result: ChatWordsResult } | null;
  readonly ideas: readonly ChatReplyIdea[] | null;
  /** 그 칩의 메시지 · 보기마다 서버 자리(ADR-0210 D1) — 모르면 없음. */
  readonly ideasRef?: ChatIdeasRef;
  readonly crisis: readonly ChatCrisisResource[] | null;
  readonly finished: boolean;
  readonly failure: RemoteSendFailure | null;
  /** `done`의 서버 지갑(ADR-0155) — 낸 값과 그 뒤 잔액(크레딧이 없는 서버는 null). 틀린 값이면 없음. */
  readonly wallet: TurnWallet | null;
};

export type TurnWallet = { readonly creditsSpent: number; readonly balance: number | null };

export const initialTurnState: TurnState = {
  userMessageId: null,
  assistantMessageId: null,
  segments: [],
  bubbles: [],
  notices: [],
  correction: null,
  chatWords: null,
  ideas: null,
  crisis: null,
  finished: false,
  failure: null,
  wallet: null,
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

const countOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
const walletOf = (payload: Record<string, unknown>): TurnWallet | null => {
  const creditsSpent = countOf(payload.creditsSpent);
  const balance = payload.balance === null ? null : countOf(payload.balance);
  if (creditsSpent === null || (payload.balance !== null && balance === null)) return null;
  return { creditsSpent, balance };
};

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
      const result = chatWordsOf(payload);
      const userMessageId =
        typeof payload.userMessageId === "string" ? payload.userMessageId : null;
      if (userMessageId === null) return state;
      return {
        ...state,
        ...(card === null ? {} : { correction: { userMessageId, card } }),
        ...(result === null ? {} : { chatWords: { userMessageId, result } }),
      };
    }
    case "suggestions": {
      if (payload.status !== "ok") return state;
      const ideas = ideasOf(payload.items);
      if (ideas === null) return state;
      const owner =
        typeof payload.messageId === "string" ? payload.messageId : state.assistantMessageId;
      const ideasRef = ideasRefOf(owner, payload.items);
      return ideasRef === null ? { ...state, ideas } : { ...state, ideas, ideasRef };
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
      return { ...state, finished: true, wallet: walletOf(payload) };
    default:
      return state;
  }
}

/** 스트림이 끝났습니다. `done` 없이 끝났으면 넘긴 실패로 닫습니다. */
export function endTurn(state: TurnState, _reason: string, failure: RemoteSendFailure): TurnState {
  return state.finished ? state : { ...state, finished: true, failure };
}
