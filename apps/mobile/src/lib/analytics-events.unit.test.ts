import { describe, expect, test, vi } from "vitest";

import type {
  AnalyticsCaptureClient,
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsEventSinks,
} from "./analytics.contract";
import {
  analyticsCaptureFrom,
  analyticsEventSinksFrom,
  noAnalyticsEventSinks,
  noAnalyticsSession,
} from "./analytics-events";

const sinkKeys = [
  "entryEventSink",
  "messengerEventSink",
  "visualNovelEventSink",
  "phoneCallEventSink",
  "notificationEventSink",
  "settingsEventSink",
  "episodeIntroEventSink",
] as const satisfies readonly (keyof AnalyticsEventSinks)[];

// 이름 23개 · 모양 26개(열림 이벤트 셋이 출처별 두 모양).
const events: readonly AnalyticsEvent[] = [
  { name: "entry_screen_viewed", screen: "onboarding" },
  { name: "entry_login_method_selected", method: "phone" },
  { name: "entry_completed" },
  {
    name: "messenger_unit_opened",
    unitId: "appointment-confirmation",
    entrySource: "journey",
    entryStatus: "available",
  },
  { name: "messenger_unit_opened", unitId: "appointment-confirmation", entrySource: "roleplay" },
  {
    name: "messenger_unit_completed",
    unitId: "appointment-confirmation",
    entrySource: "journey",
  },
  {
    name: "messenger_unit_exited_incomplete",
    unitId: "appointment-confirmation",
    entrySource: "roleplay",
  },
  {
    name: "visual_novel_unit_opened",
    unitId: "cafe-arrival-visual-novel",
    entrySource: "journey",
    entryStatus: "completed",
    entryBeatId: "find",
  },
  {
    name: "visual_novel_unit_opened",
    unitId: "cafe-arrival-visual-novel",
    entrySource: "roleplay",
  },
  {
    name: "visual_novel_unit_completed",
    unitId: "cafe-arrival-visual-novel",
    entrySource: "journey",
  },
  {
    name: "visual_novel_unit_exited_incomplete",
    unitId: "cafe-arrival-visual-novel",
    beatId: "enter",
    entrySource: "roleplay",
  },
  {
    name: "visual_novel_unit_replay_started",
    unitId: "cafe-arrival-visual-novel",
    entrySource: "journey",
  },
  {
    name: "phone_call_unit_opened",
    unitId: "appointment-confirmation-phone-call",
    entrySource: "journey",
    entryStatus: "available",
  },
  {
    name: "phone_call_unit_opened",
    unitId: "appointment-confirmation-phone-call",
    entrySource: "roleplay",
  },
  { name: "notifications_opened" },
  { name: "notification_item_tapped", notificationId: "n-1", target: "messenger" },
  { name: "notification_item_deleted", notificationId: "n-2", target: "roleplay-list" },
  { name: "settings_opened" },
  { name: "profile_opened" },
  { name: "terms_opened" },
  { name: "session_option_changed", option: "auto-play-audio", value: false },
  { name: "episode_intro_viewed", episodeId: "tutorial" },
  { name: "episode_intro_skipped", episodeId: "tutorial" },
  { name: "episode_intro_continued", episodeId: "tutorial", hasPrologue: true },
  { name: "episode_intro_exited", episodeId: "tutorial", stage: "prologue" },
  { name: "episode_prologue_completed", episodeId: "tutorial", prologueKind: "call" },
];

function withoutName(event: AnalyticsEvent): Record<string, unknown> {
  const { name: _name, ...rest } = event;
  return rest;
}

describe("analyticsCaptureFrom", () => {
  test("AE1: 표가 이름 23개 · 모양 26개를 다 덮는다", () => {
    expect(events).toHaveLength(26);
    expect(new Set(events.map((e) => e.name)).size).toBe(23);
  });

  test.each(events.map((e, i) => [`${i + 1}. ${e.name}`, e] as const))(
    "AE1: %s — 이름은 그대로, properties는 name만 뺀 나머지",
    (_label, event) => {
      const capture = analyticsCaptureFrom(event);
      expect(capture.event).toBe<AnalyticsEventName>(event.name);
      expect(capture.properties).toStrictEqual(withoutName(event));
    },
  );

  test("AE2: 입력을 고치지 않는다", () => {
    const event = Object.freeze({
      name: "session_option_changed",
      option: "auto-play-audio",
      value: true,
    } as const);
    const before = structuredClone(event);
    expect(() => analyticsCaptureFrom(event)).not.toThrow();
    expect(event).toStrictEqual(before);
  });

  test("AE2: properties에 name 키가 없다", () => {
    for (const event of events) {
      expect(Object.keys(analyticsCaptureFrom(event).properties)).not.toContain("name");
    }
  });

  test("AE2: 키 순서를 보존하고 키를 더하지 않는다", () => {
    const capture = analyticsCaptureFrom({
      name: "visual_novel_unit_exited_incomplete",
      unitId: "cafe-arrival-visual-novel",
      beatId: "find",
      entrySource: "journey",
    });
    expect(Object.keys(capture.properties)).toStrictEqual(["unitId", "beatId", "entrySource"]);
  });
});

describe("noAnalyticsEventSinks / noAnalyticsSession", () => {
  test("AE3: 일곱 sink가 모두 null이다 — no-op 함수가 아니다", () => {
    expect(Object.keys(noAnalyticsEventSinks).sort()).toStrictEqual([...sinkKeys].sort());
    for (const key of sinkKeys) {
      expect(noAnalyticsEventSinks[key]).toBeNull();
    }
  });

  test("AE3: noAnalyticsSession은 sink 일곱 null + user null이다(identify 자리 없음)", () => {
    expect(noAnalyticsSession).toStrictEqual({ sinks: noAnalyticsEventSinks, user: null });
  });
});

function fakeClient() {
  const capture = vi.fn<AnalyticsCaptureClient["capture"]>();
  const identify = vi.fn<AnalyticsCaptureClient["identify"]>();
  const client: AnalyticsCaptureClient = { capture, identify };
  return { client, capture, identify };
}

describe("analyticsEventSinksFrom", () => {
  test("AE4: null 클라이언트는 일곱 모두 null이다", () => {
    const sinks = analyticsEventSinksFrom(null);
    expect(sinks).toStrictEqual(noAnalyticsEventSinks);
    for (const key of sinkKeys) {
      expect(sinks[key]).toBeNull();
    }
  });

  test("AE5: 일곱 sink가 이벤트 하나당 capture를 정확히 1회 부른다", () => {
    const { client, capture, identify } = fakeClient();
    const sinks = analyticsEventSinksFrom(client);
    const bySink: readonly (readonly [unknown, AnalyticsEvent])[] = [
      [sinks.entryEventSink, events[0]!],
      [sinks.messengerEventSink, events[3]!],
      [sinks.visualNovelEventSink, events[7]!],
      [sinks.phoneCallEventSink, events[12]!],
      [sinks.notificationEventSink, events[15]!],
      [sinks.settingsEventSink, events[19]!],
      [sinks.episodeIntroEventSink, events[21]!],
    ];
    for (const [sink, event] of bySink) {
      expect(sink).toBeTypeOf("function");
      capture.mockClear();
      (sink as (e: AnalyticsEvent) => void)(event);
      const expected = analyticsCaptureFrom(event);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(capture).toHaveBeenCalledWith(expected.event, expected.properties);
    }
    expect(identify).not.toHaveBeenCalled();
  });

  test("AE6: capture가 던져도 sink는 던지지 않는다", () => {
    const client: AnalyticsCaptureClient = {
      capture: () => {
        throw new Error("boom");
      },
      identify: () => undefined,
    };
    const sinks = analyticsEventSinksFrom(client);
    const sink = sinks.settingsEventSink as unknown as (e: AnalyticsEvent) => void;
    expect(sink).toBeTypeOf("function");
    expect(() => sink({ name: "settings_opened" })).not.toThrow();
  });
});
