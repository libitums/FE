// 답장 도착 토스트의 제품 사용 이벤트입니다(ADR-0200) — PostHog만(Airbridge로 보내지 않음). 타입만 둡니다.
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다. 값은 문자열뿐입니다(수는 10진 문자열). 메시지 본문은 싣지 않습니다.

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
  readonly characterId: string;
  /** 내 말에 대한 답 · 인물이 먼저 보낸 말(선톡 · 스토리 반응 · 첫 인사). */
  readonly kind: "reply" | "proactive";
};

/**
 * `shown`: 새 카드가 섬(같은 인물의 내용 바꿔 끼움은 내지 않음) — `more` = 맨 아래 「+N」, `stack` = 그때 쌓인 장 수(1 ~ 3, 개정 1),
 * `deferred` = 레슨 중 미뤘다가 띄움,
 * `screen` = 그때 화면 이름. `opened`: 카드를 눌러 그 방으로 감.
 */
export type ChatReplyToastEvent =
  | (Common & {
      readonly name: "chat_reply_toast_shown";
      readonly more: string;
      readonly stack: string;
      readonly deferred: "true" | "false";
      readonly screen: string;
    })
  | (Common & { readonly name: "chat_reply_toast_opened" });
