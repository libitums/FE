// 메신저 출처가 컴패니언 서버에 닿는 포트입니다(ADR-0137). 서버 JSON은 순수 해석기(`companion-parse.ts`)가 앱 모양으로 풀고,
// 출처(`chat-fixture-remote.ts`)는 이 포트만 압니다. 어떤 호출도 던지지 않습니다 — 실패는 null · onEnd로 옵니다.

import type { ChatCorrection } from "./chat-feedback.contract";
import type { ChatMessage, ChatReplyIdea } from "./chat-source.contract";

/** 서버 기록 한 쪽을 앱 모양으로 푼 값입니다. 오래된 것부터, 숨김 메시지는 빠져 있습니다. */
export type RemoteHistory = {
  readonly messages: readonly ChatMessage[];
  /** 내 글 id → 서버 교정 카드(고칠 것이 있을 때만). */
  readonly corrections: Readonly<Record<string, ChatCorrection>>;
  /** 마지막 캐릭터 메시지에 저장된 추천 답변 — 없으면 null. */
  readonly ideas: readonly ChatReplyIdea[] | null;
};

/** 첫 인사 — 서버가 인사를 만들지 않았으면(이미 메시지가 있음 · 대화 불가) null. */
export type RemoteGreeting = {
  readonly messages: readonly ChatMessage[];
  readonly ideas: readonly ChatReplyIdea[] | null;
};

/** 턴 스트림의 콜백입니다 — 호스트 SSE 모듈(ADR-0124)의 모양과 같습니다. */
export type RemoteTurnHandlers = {
  readonly onOpen: (status: number) => void;
  readonly onEvent: (event: string, data: string) => void;
  /** 스트림마다 정확히 한 번. `complete`가 아니면 실패 · 취소이고, `http-error`면 `detail`이 응답 본문입니다. */
  readonly onEnd: (reason: string, detail: string | null) => void;
};

export type ChatRemote = {
  readonly loadHistory: (characterId: string) => Promise<RemoteHistory | null>;
  readonly greet: (characterId: string) => Promise<RemoteGreeting | null>;
  /** 보낸 글 하나의 턴을 엽니다. `clientMessageId`는 UUID v4(서버 멱등). */
  readonly openTurn: (
    request: {
      readonly characterId: string;
      readonly text: string;
      readonly clientMessageId: string;
    },
    handlers: RemoteTurnHandlers,
  ) => { readonly cancel: () => void };
};

/** 서버가 보내기를 막은 까닭입니다 — 입력 줄 자리 안내(입력 막힘)와 로그 회색 줄(실패) 둘로 나뉩니다. */
export type RemoteSendFailure =
  | { readonly kind: "blocked"; readonly until: number }
  | { readonly kind: "usage-limit"; readonly resetsAt: number }
  | { readonly kind: "age-restricted" }
  | { readonly kind: "no-credits" }
  /** 이 계정 등급으로는 그 인물과 대화할 수 없음(무료는 체험 인물만 — 서버 판정). */
  | { readonly kind: "not-available" }
  /** 서버가 받은 뒤 SSE `error` — 코드는 서버 표(`STREAM_ERRORS`) 그대로. */
  | { readonly kind: "stream-error"; readonly code: string }
  | { readonly kind: "failed" };

/** 서버 보내기 실패 줄(로그 가운데 회색 줄) — 오류 코드마다 무엇이 났고 무엇을 하면 되는지(ADR-0137 · 0138). */
export type ChatSendFailureNotice =
  | "no-credits"
  | "not-available"
  | "send-failed"
  | "reply-failed"
  | "cant-reply"
  | "rate-limited"
  | "update-required"
  | "server-error"
  | "signed-out";
