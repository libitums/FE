// 친구 스토리 이벤트 이름(ADR-0178 D8) — airbridge 매핑 표(`airbridge-events.test-support`)의 전체 이름 목록이 펼쳐 씁니다(줄 수 한도).

export const friendStoryEventNames = [
  "friend_story_row_viewed",
  "friend_story_viewed",
  "friend_story_replied",
  "friend_story_word_saved",
  "friend_story_closed",
  // 내 스토리(ADR-0179).
  "my_story_create_opened",
  "my_story_guide_closed",
  "my_story_posted",
  "my_story_post_failed",
  "my_story_viewed",
  "my_story_answered",
  "my_story_replied",
  "my_story_deleted",
  "my_story_keep_toggled",
] as const;
