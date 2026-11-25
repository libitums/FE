// 「새 메시지 ↓」 알약의 제품 사용 이벤트입니다(ADR-0117 2026-11-25) — PostHog만(Airbridge로 보내지 않음). 타입만 둡니다.
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다. 값은 문자열뿐입니다(수는 10진 문자열). 메시지 본문은 싣지 않습니다.

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
};

/** 위로 올려 읽는 중 온 상대 줄의 알약을 눌러 끝으로 감 — 누름마다 한 번(`count` = 그동안 온 줄 수, `media` = 마지막 줄 종류). */
export type ChatPillEvent = Common & {
  readonly name: "chat_new_messages_jumped";
  readonly characterId: string;
  readonly count: string;
  readonly media: "message" | "photo" | "voice";
};
