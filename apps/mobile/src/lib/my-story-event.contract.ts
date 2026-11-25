// 내 스토리의 제품 사용 이벤트입니다(ADR-0194) — PostHog만(Airbridge로 보내지 않음). 타입만 둡니다.
// 공통 속성은 `companion-event.contract.ts`의 묶음과 같은 규약입니다. 값은 문자열 · 불리언뿐(수는 10진 문자열). 단어 · 예문은 싣지 않습니다.

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
};

/**
 * `create_opened`: 「+」를 누름(`first` = 처음 안내가 섰는가). `guide_closed`: 처음 안내를 닫음(`choice` = 만들기 · 나중에).
 * `posted`: 올림 성공(`kind`). `post_failed`: 올림 실패(`reason` = 서버 꺼짐 · 하루 상한 · 이번 창을 이미 씀 · 그 밖). `viewed`: 내 스토리를 엶(`reactions` = 반응 수,
 * `unseen` = 그때 처음 본 반응 수, `from` = 연 곳). `chat_opened`: 반응의 「Open chat」으로 그 인물 방에 감(ADR-0191 — 옛
 * `answered` · `replied`를 대신함, `message` = 반응 메시지 id를 알았는가). `deleted`: 지움(`scope` = 하나 · 모두, `from` = 줄에서 연 보기 · 보관함). `keep_toggled`: 보관
 * 스위치 저장 성공 뒤.
 */
export type MyStoryEvent =
  | (Common & { readonly name: "my_story_create_opened"; readonly first: boolean })
  | (Common & { readonly name: "my_story_guide_closed"; readonly choice: "start" | "later" })
  | (Common & { readonly name: "my_story_posted"; readonly kind: "word" | "card" | "text" })
  | (Common & {
      readonly name: "my_story_post_failed";
      readonly reason: "off" | "daily_limit" | "window_used" | "text_blocked" | "crisis" | "failed";
    })
  | (Common & {
      readonly name: "my_story_viewed";
      readonly reactions: string;
      readonly unseen: string;
      readonly from: "row" | "archive" | "posted";
    })
  | (Common & {
      readonly name: "my_story_chat_opened";
      readonly characterId: string;
      readonly message: boolean;
    })
  | (Common & { readonly name: "my_story_keep_toggled"; readonly keep: boolean })
  | (Common & {
      readonly name: "my_story_deleted";
      readonly scope: "one" | "all";
      readonly from: "viewer" | "archive";
    });
