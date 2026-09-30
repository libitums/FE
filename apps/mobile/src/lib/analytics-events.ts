// 이벤트 → capture 매핑 · sink 일곱 — 순수 · SDK import 0. 계약: spec §3.
import type {
  AnalyticsCaptureFrom,
  AnalyticsEvent,
  AnalyticsEventSinks,
  AnalyticsEventSinksFrom,
  AnalyticsSession,
} from "./analytics.contract";

export const analyticsCaptureFrom: AnalyticsCaptureFrom = (event) => {
  const { name, ...properties } = event;
  return { event: name, properties };
};

export const noAnalyticsEventSinks: AnalyticsEventSinks = {
  entryEventSink: null,
  messengerEventSink: null,
  visualNovelEventSink: null,
  phoneCallEventSink: null,
  notificationEventSink: null,
  settingsEventSink: null,
  episodeIntroEventSink: null,
};

export const noAnalyticsSession: AnalyticsSession = {
  sinks: noAnalyticsEventSinks,
  user: null,
};

export const analyticsEventSinksFrom: AnalyticsEventSinksFrom = (client) => {
  if (client === null) {
    return noAnalyticsEventSinks;
  }
  // 분석은 화면을 막지 않습니다 — 매핑 · capture 실패는 삼킵니다.
  const sink = (event: AnalyticsEvent): void => {
    try {
      const captured = analyticsCaptureFrom(event);
      client.capture(captured.event, captured.properties);
    } catch {
      // 보내지 못한 이벤트는 버립니다.
    }
  };
  return {
    entryEventSink: sink,
    messengerEventSink: sink,
    visualNovelEventSink: sink,
    phoneCallEventSink: sink,
    notificationEventSink: sink,
    settingsEventSink: sink,
    episodeIntroEventSink: sink,
  };
};
