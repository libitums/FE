// 추천 친구 이벤트의 견본(ADR-0162) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서 가져다 씁니다.
import type { AnalyticsEvent } from "./analytics.contract";

export const suggestedFriendEventExamples = [
  { name: "suggested_friend_viewed", surface: "chat", daysSinceFirstOpen: "3", count: "2" },
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
] as const satisfies readonly AnalyticsEvent[];
