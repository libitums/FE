// 채팅 알림 권한 카드 이벤트의 이름 · 견본(ADR-0197 D4) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서
// 가져다 씁니다. 모두 PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const chatPushAskEventNames = [
  "chat_push_ask_shown",
  "chat_push_ask_tapped",
  "chat_push_ask_answered",
] as const;

export const chatPushAskEventExamples = [
  {
    name: "chat_push_ask_shown",
    surface: "chat",
    daysSinceFirstOpen: "1",
    characterId: "owner",
    count: "1",
  },
  {
    name: "chat_push_ask_tapped",
    surface: "chat",
    daysSinceFirstOpen: "1",
    characterId: "owner",
    choice: "turn_on",
  },
  {
    name: "chat_push_ask_answered",
    surface: "chat",
    daysSinceFirstOpen: "1",
    characterId: "owner",
    result: "allowed",
  },
] as const satisfies readonly AnalyticsEvent[];
