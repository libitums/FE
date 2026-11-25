// 추천 친구 이벤트의 견본(ADR-0162) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서 가져다 씁니다.
import type { AnalyticsEvent } from "./analytics.contract";

export const suggestedFriendEventExamples = [
  { name: "suggested_friend_viewed", surface: "chat", daysSinceFirstOpen: "3", count: "2" },
  {
    name: "suggested_friend_opened",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "seoyeon",
    kind: "general",
    from: "row",
  },
  {
    name: "suggested_friend_added",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "doyun",
    kind: "story",
    from: "row",
    via: "free",
  },
  {
    name: "early_access_tapped",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "jaemin",
    price: "100",
    from: "directory",
  },
  {
    name: "early_access_completed",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "jaemin",
    outcome: "short",
  },
  // 친구 스토리(ADR-0178 D8) — 같은 메신저 목록 · 방에서 납니다. PostHog만.
  {
    name: "friend_story_row_viewed",
    surface: "chat",
    daysSinceFirstOpen: "3",
    count: "4",
    unseen: "2",
  },
  {
    name: "friend_story_viewed",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "mina",
    met: true,
    from: "row",
    index: "1",
    total: "3",
  },
  {
    name: "friend_story_closed",
    surface: "chat",
    daysSinceFirstOpen: "3",
    shown: "2",
    total: "3",
    skipped: "1",
    reason: "closed",
  },
  {
    name: "friend_story_replied",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "mina",
    via: "chip",
    free: true,
    where: "viewer",
  },
  {
    name: "friend_story_word_saved",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "mina",
  },
  // 비회원 로그인 권유(ADR-0166) — 같은 메신저 목록 · 방에서 납니다.
  {
    name: "chat_sign_in_prompt_closed",
    surface: "chat",
    daysSinceFirstOpen: "0",
    trigger: "send",
    choice: "sign_in",
  },
] as const satisfies readonly AnalyticsEvent[];
