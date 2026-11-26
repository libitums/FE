// 채팅 첫 답장 뒤 알림 권한 카드(ADR-0197)의 화면 쪽 어휘입니다. 판정 · 등록은 결선이 포트로 내리고, 화면은 카드 · 접힌 줄만 그립니다.

/** `due`의 답 — 카드를 세울지와, 세우면 이번이 몇 번째인지(기록은 포트가 이미 적음). */
export type ChatPushAskDue =
  | { readonly show: false }
  | { readonly show: true; readonly count: number };

/** Turn on 뒤 시스템 창의 결과. 권한을 모르면(모듈 없음 · 세션 없음) null. */
export type ChatPushAskAnswer = "allowed" | "denied" | null;

/** 결선(`app/chat-push-ask-wiring.ts`)이 회원 방에만 내리는 포트입니다. */
export type ChatPushAskPort = {
  /** 첫 답장 직후 한 번. 이미 허용이면 조용히 등록하고 `show: false`. */
  readonly due: () => Promise<ChatPushAskDue>;
  /** 시스템 창을 띄우고(미결정이면) 결과 권한을 돌려줍니다. */
  readonly turnOn: () => Promise<ChatPushAskAnswer>;
};

/** 카드 자리의 상태 — 아무것도 없음 · 카드 · 답 기다림 · 켠 뒤 한 줄. */
export type ChatPushAskView = "none" | "card" | "asking" | "on";

/** 메신저 문구 표의 `pushAsk` 칸입니다(ADR-0197 D3). */
export type ChatPushAskCopy = {
  readonly title: (name: string) => string;
  readonly body: string;
  readonly turnOn: string;
  readonly notNow: string;
  readonly on: (name: string) => string;
};

export const chatPushAskTestIds = {
  card: "messenger-chat-push-ask",
  turnOn: "messenger-chat-push-ask-turn-on",
  notNow: "messenger-chat-push-ask-not-now",
  on: "messenger-chat-push-ask-on",
} as const;
