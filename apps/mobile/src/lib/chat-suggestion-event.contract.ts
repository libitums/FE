// 채팅 「답할 문장 추천」(보기 판)의 제품 사용 이벤트입니다(ADR-0194) — PostHog만(Airbridge로 보내지 않음). 타입만 둡니다.
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다. 값은 문자열 · 불리언뿐(수는 10진 문자열)이고, 추천 문장 내용은 싣지 않습니다.

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
};

/** 그 추천이 붙은 캐릭터 답장의 출처 — 서버 `messages.origin`. 가짜 출처 · 출처를 주지 않는 옛 서버는 `unknown`. */
export type SuggestionReplyOrigin = "greeting" | "turn" | "proactive" | "unknown";

/** 지금 보내면 이 방에서 몇 번째 내 글이 되는지 — 4통째부터는 `4+`. */
export type MyMessageNumber = "1" | "2" | "3" | "4+";

type SuggestionCommon = Common & {
  readonly characterId: string;
  /** 판에 보인 추천 수(서버 `suggestion_display_max` 안, 1 ~ 3). */
  readonly count: string;
  readonly replyOrigin: SuggestionReplyOrigin;
  readonly myMessageNumber: MyMessageNumber;
};

/**
 * `shown`: 보기 판이 그 묶음으로 처음 그려질 때 — 방 화면 마운트당 묶음마다 한 번(판을 접었다 다시 열어도 한 번).
 * `tapped`: 보기를 누름(보내기 관문 전 — 엽전 부족 · 비회원 권유로 막혀도 의향은 남김). `index`는 위에서부터 0. 같은 묶음 같은 자리를
 * 거듭 누르면 한 번. 실제로 보냈는지는 `chat_message_sent.fromSuggestion`이 말합니다.
 */
export type ChatSuggestionEvent =
  | (SuggestionCommon & { readonly name: "chat_suggestion_shown" })
  | (SuggestionCommon & { readonly name: "chat_suggestion_tapped"; readonly index: string });
