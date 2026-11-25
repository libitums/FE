// 채팅 보내기 · 답할 문장 추천 이벤트의 견본(ADR-0194) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서
// 가져다 씁니다. 모두 PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const suggestionEventNames = ["chat_suggestion_shown", "chat_suggestion_tapped"] as const;

export const suggestionEvents = [
  {
    name: "chat_message_sent",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "duksu",
    paid: true,
    cost: "3",
    fromSuggestion: true,
  },
  {
    name: "chat_suggestion_shown",
    surface: "chat",
    daysSinceFirstOpen: "0",
    characterId: "duksu",
    count: "2",
    replyOrigin: "greeting",
    myMessageNumber: "1",
  },
  {
    name: "chat_suggestion_tapped",
    surface: "chat",
    daysSinceFirstOpen: "0",
    characterId: "duksu",
    index: "0",
    count: "2",
    replyOrigin: "turn",
    myMessageNumber: "4+",
  },
] as const satisfies readonly AnalyticsEvent[];
