// 메신저 첫 입장 안내 이벤트의 이름 · 견본(ADR-0139 · ADR-0190) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서
// 가져다 씁니다. 모두 PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const messengerGuideEventNames = [
  "messenger_guide_finished",
  "messenger_guide_keyboard",
  "messenger_tab_opened",
] as const;

export const messengerGuideEventExamples = [
  {
    name: "messenger_guide_finished",
    surface: "chat",
    daysSinceFirstOpen: "2",
    part: "room",
    outcome: "skipped",
  },
  {
    name: "messenger_guide_keyboard",
    surface: "chat",
    daysSinceFirstOpen: "0",
    stage: "phone",
    action: "shown",
  },
  { name: "messenger_tab_opened", surface: "chat", daysSinceFirstOpen: "0", badge: "first" },
] as const satisfies readonly AnalyticsEvent[];
