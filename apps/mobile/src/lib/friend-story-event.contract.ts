// 친구 스토리의 제품 사용 이벤트입니다(ADR-0178 D8) — PostHog만(Airbridge로 보내지 않음). 타입만 둡니다.
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다. 값은 문자열 · 불리언뿐입니다(수는 10진 문자열).

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
};

/**
 * `row_viewed`: 스토리 줄이 실제로 그려졌을 때 목록 마운트당 한 번(줄 단위 — 추천 줄이 대신 선 노출은 `suggested_friend_viewed`).
 * `viewed`: 보기에서 한 장이 설 때마다(장 단위 — `met` = 내 친구인가, `from` = 연 곳, `index` · `total` = 몇째 장 / 장 수).
 * `closed`: 보기가 닫힐 때 한 번(`shown` = 선 장 수, `skipped` = 다음 탭으로 넘긴 수, `reason` = 끝까지 · 닫기 · 뒤로 · 답장).
 * `replied`: 인용이 실린 글을 보냄(`free` = 보기에서 본 무료 안내 — 정본은 서버, `where` = 보기 · 대화방). `word_saved`: 단어 알약으로 단어장에 넣음.
 */
export type FriendStoryEvent =
  | (Common & {
      readonly name: "friend_story_row_viewed";
      readonly count: string;
      readonly unseen: string;
    })
  | (Common & {
      readonly name: "friend_story_viewed";
      readonly characterId: string;
      readonly met: boolean;
      readonly from: "row" | "list" | "watch_all" | "push";
      readonly index: string;
      readonly total: string;
    })
  | (Common & {
      readonly name: "friend_story_closed";
      readonly shown: string;
      readonly total: string;
      readonly skipped: string;
      readonly reason: "completed" | "closed" | "back" | "replied";
    })
  | (Common & {
      readonly name: "friend_story_replied";
      readonly characterId: string;
      readonly via: "chip" | "typed";
      readonly free: boolean;
      /** 보낸 자리 — 스토리 보기에서 바로(D5 개정) · 대화방 인용 띠(안 만난 친구 추가 뒤). */
      readonly where: "viewer" | "room";
    })
  | (Common & { readonly name: "friend_story_word_saved"; readonly characterId: string });
