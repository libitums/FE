// 제품 이벤트 → Meta 앱 이벤트 매핑 · sink 합성 — 순수 · SDK import 0. 계약: ADR-0057.
import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import type {
  MetaAppEvent,
  MetaAppEventFrom,
  MetaAppEventLogger,
  WithMetaAppEvents,
} from "./meta-events.contract";

function mapEvent(event: AnalyticsEvent): MetaAppEvent | null {
  switch (event.name) {
    case "entry_completed":
      return { name: "fb_mobile_complete_registration", parameters: {} };
    case "messenger_unit_completed":
      if (event.entrySource !== "journey") return null;
      return {
        name: "fb_mobile_level_achieved",
        parameters: { fb_level: event.unitId, fb_content_type: "messenger" },
      };
    case "visual_novel_unit_completed":
      if (event.entrySource !== "journey") return null;
      return {
        name: "fb_mobile_level_achieved",
        parameters: { fb_level: event.unitId, fb_content_type: "visual_novel" },
      };
    default:
      return null;
  }
}

export const metaAppEventFrom: MetaAppEventFrom = mapEvent;

// 원래 sink(PostHog)와 Meta 전달은 서로의 예외를 막지 않습니다 — 각각 삼킵니다.
function forwardTo<T extends AnalyticsEvent>(
  original: ((event: T) => void) | null,
  logger: MetaAppEventLogger,
): (event: T) => void {
  return (event) => {
    try {
      original?.(event);
    } catch {
      // PostHog 쪽 실패가 Meta 전달을 막지 않습니다.
    }
    try {
      const mapped: MetaAppEvent | null = metaAppEventFrom(event);
      if (mapped !== null) logger(mapped);
    } catch {
      // Meta 쪽 실패가 화면을 막지 않습니다.
    }
  };
}

export const withMetaAppEvents: WithMetaAppEvents = (sinks, logger) => {
  if (logger === null) return sinks;
  const composed: AnalyticsEventSinks = {
    ...sinks,
    entryEventSink: forwardTo(sinks.entryEventSink, logger),
    messengerEventSink: forwardTo(sinks.messengerEventSink, logger),
    visualNovelEventSink: forwardTo(sinks.visualNovelEventSink, logger),
  };
  return composed;
};
