// 제품 이벤트 → Airbridge 이벤트 매핑 · sink 합성 — 순수 · SDK import 0. 계약: docs/adr/0063-airbridge-events.md.
import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import type {
  AirbridgeEvent,
  AirbridgeEventFrom,
  AirbridgeEventTracker,
  WithAirbridgeEvents,
} from "./airbridge-events.contract";

function mapEvent(event: AnalyticsEvent): AirbridgeEvent | null {
  switch (event.name) {
    case "entry_completed":
      return { category: "airbridge.user.signup", semanticAttributes: {} };
    case "messenger_unit_completed":
      if (event.entrySource !== "journey") return null;
      return {
        category: "airbridge.achieveLevel",
        semanticAttributes: { level: event.unitId, label: "messenger" },
      };
    case "visual_novel_unit_completed":
      if (event.entrySource !== "journey") return null;
      return {
        category: "airbridge.achieveLevel",
        semanticAttributes: { level: event.unitId, label: "visual_novel" },
      };
    default:
      return null;
  }
}

export const airbridgeEventFrom: AirbridgeEventFrom = mapEvent;

// 원래 sink(PostHog)와 Airbridge 전달은 서로의 예외를 막지 않습니다 — 각각 삼킵니다.
function forwardTo<T extends AnalyticsEvent>(
  original: ((event: T) => void) | null,
  tracker: AirbridgeEventTracker,
): (event: T) => void {
  return (event) => {
    try {
      original?.(event);
    } catch {
      // PostHog 쪽 실패가 Airbridge 전달을 막지 않습니다.
    }
    try {
      const mapped: AirbridgeEvent | null = airbridgeEventFrom(event);
      if (mapped !== null) tracker(mapped);
    } catch {
      // Airbridge 쪽 실패가 화면을 막지 않습니다.
    }
  };
}

export const withAirbridgeEvents: WithAirbridgeEvents = (sinks, tracker) => {
  if (tracker === null) return sinks;
  const composed: AnalyticsEventSinks = {
    ...sinks,
    entryEventSink: forwardTo(sinks.entryEventSink, tracker),
    messengerEventSink: forwardTo(sinks.messengerEventSink, tracker),
    visualNovelEventSink: forwardTo(sinks.visualNovelEventSink, tracker),
  };
  return composed;
};
