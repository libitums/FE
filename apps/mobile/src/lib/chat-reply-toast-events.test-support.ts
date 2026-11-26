// 답장 도착 토스트 이벤트의 이름 · 견본(ADR-0200) — airbridge 매핑 표(`airbridge-events.test-support`)가 줄 수 한도 안에서
// `chat-push-ask-events.test-support`의 묶음을 거쳐 가져다 씁니다. 모두 PostHog만(Airbridge로 나가지 않음).
import type { AnalyticsEvent } from "./analytics.contract";

export const chatReplyToastEventNames = [
  "chat_reply_toast_shown",
  "chat_reply_toast_opened",
] as const;

export const chatReplyToastEventExamples = [
  {
    name: "chat_reply_toast_shown",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "mina",
    kind: "reply",
    more: "1",
    stack: "2",
    deferred: "false",
    screen: "journey-map",
  },
  {
    name: "chat_reply_toast_opened",
    surface: "chat",
    daysSinceFirstOpen: "3",
    characterId: "mina",
    kind: "proactive",
  },
] as const satisfies readonly AnalyticsEvent[];
