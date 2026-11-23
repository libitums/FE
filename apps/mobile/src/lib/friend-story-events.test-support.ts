// 친구 스토리 이벤트 이름(ADR-0177 D8) — airbridge 매핑 표(`airbridge-events.test-support`)의 전체 이름 목록이 펼쳐 씁니다(줄 수 한도).

export const friendStoryEventNames = [
  "friend_story_row_viewed",
  "friend_story_viewed",
  "friend_story_replied",
  "friend_story_word_saved",
] as const;
