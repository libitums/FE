import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
import { learnerProfileSavedEvent } from "./learner-profile";

const sinkKeys = [
  "entryEventSink",
  "notificationEventSink",
  "settingsEventSink",
  "episodeIntroEventSink",
] as const satisfies readonly (keyof AnalyticsEventSinks)[];

// 메신저 · 비주얼 노벨 · 전화 이벤트는 지웠습니다(sink 넷, 이름 36).
const events: readonly AnalyticsEvent[] = [
  { name: "entry_screen_viewed", screen: "onboarding" },
  { name: "entry_login_method_selected", method: "phone" },
  { name: "entry_completed" },
  { name: "entry_returning_learner_entered", method: "google" },
  { name: "app_update_required_shown", platform: "android", build: "6", minBuild: "7" },
  { name: "notifications_opened" },
  { name: "notification_item_tapped", notificationId: "n-1", target: "roleplay-list" },
  { name: "notification_item_deleted", notificationId: "n-2", target: "roleplay-list" },
  { name: "push_notification_opened", target: "journey-map" },
  { name: "settings_opened" },
  { name: "profile_opened" },
  { name: "notification_settings_opened" },
  { name: "feedback_opened" },
  { name: "feedback_submitted", rating: "5", hasMessage: true },
  { name: "legal_document_opened", document: "privacy-policy", source: "settings" },
  { name: "legal_document_opened", document: "terms-of-use", source: "login" },
  { name: "session_option_changed", option: "auto-play-audio", value: false },
  { name: "episode_intro_viewed", episodeId: "tutorial" },
  { name: "episode_intro_skipped", episodeId: "tutorial" },
  { name: "episode_intro_continued", episodeId: "tutorial", hasPrologue: true },
  { name: "episode_intro_exited", episodeId: "tutorial", stage: "prologue" },
  { name: "episode_survey_answered", episodeId: "tutorial", rating: "4" },
  { name: "episode_survey_skipped", episodeId: "tutorial" },
  { name: "episode_prologue_completed", episodeId: "tutorial", prologueKind: "cuts" },
];

function withoutName(event: AnalyticsEvent): Record<string, unknown> {
  const { name: _name, ...rest } = event;
  return rest;
}

describe("episode_content_refreshed", () => {
  test("AE-R1. 이름은 그대로, properties는 name만 뺀 일곱 필드다", () => {
    const event = {
      name: "episode_content_refreshed",
      manifest: "updated",
      fetchedCount: "1",
      lockedCount: "3",
      failedCount: "2",
      lockReasons: "client-too-old,decode-failed",
      failReasons: "http,network",
      persisted: true,
    } as const satisfies AnalyticsEvent;

    expect(analyticsCaptureFrom(event)).toStrictEqual({
      event: "episode_content_refreshed",
      properties: {
        manifest: "updated",
        fetchedCount: "1",
        lockedCount: "3",
        failedCount: "2",
        lockReasons: "client-too-old,decode-failed",
        failReasons: "http,network",
        persisted: true,
      },
    });
  });
});

describe("analyticsCaptureFrom", () => {
  test("AE1: 표가 이름 23개 · 모양 24개를 다 덮는다", () => {
    expect(events).toHaveLength(24);
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

  test("AE1: entry_returning_learner_entered는 method만 속성으로 싣는다", () => {
    expect(
      analyticsCaptureFrom({ name: "entry_returning_learner_entered", method: "google" }),
    ).toStrictEqual({
      event: "entry_returning_learner_entered",
      properties: { method: "google" },
    });
  });

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
      name: "roleplay_story_completed",
      episodeId: "u01-water",
      correctCount: "2",
      judgedCount: "3",
      skippedCount: "0",
    });
    expect(Object.keys(capture.properties)).toStrictEqual([
      "episodeId",
      "correctCount",
      "judgedCount",
      "skippedCount",
    ]);
  });
});

describe("학습자 프로필 이벤트", () => {
  const emma = { name: "Emma", countryCode: "DE" } as const;
  const profileEvents: readonly AnalyticsEvent[] = [
    learnerProfileSavedEvent("signup", null),
    learnerProfileSavedEvent("settings", emma),
    { name: "learner_profile_opened" },
  ];

  test("AE-L. 저장 · 열림 이벤트의 properties는 entry · change뿐이다 (값이 새지 않는다)", () => {
    const keysOf = (event: AnalyticsEvent): string[] =>
      Object.keys(analyticsCaptureFrom(event).properties).sort();

    expect(keysOf(profileEvents[0]!)).toEqual(["change", "entry"]);
    expect(keysOf(profileEvents[1]!)).toEqual(["change", "entry"]);
    expect(keysOf(profileEvents[2]!)).toEqual([]);
  });

  test("AE-L. 이름은 그대로 capture 이름이 되고 직렬화에 이름 · 나라 코드가 없다", () => {
    expect(profileEvents.map((event) => analyticsCaptureFrom(event).event)).toEqual([
      "learner_profile_saved",
      "learner_profile_saved",
      "learner_profile_opened",
    ]);
    expect(JSON.stringify(profileEvents.map(analyticsCaptureFrom))).not.toMatch(/Emma|"DE"/);
  });

  test("AE-L. 저장을 내는 두 sink(진입 · 설정) 모두 capture를 정확히 1회 부른다", () => {
    const { client, capture } = fakeClient();
    const sinks = analyticsEventSinksFrom(client);

    for (const sink of [sinks.entryEventSink, sinks.settingsEventSink]) {
      capture.mockClear();
      (sink as unknown as (event: AnalyticsEvent) => void)(profileEvents[0]!);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(capture).toHaveBeenCalledWith("learner_profile_saved", {
        entry: "signup",
        change: "created",
      });
    }
  });
});

describe("AN1 분석 계약의 크기", () => {
  const removedNames = [
    "messenger_unit_opened",
    "messenger_unit_completed",
    "messenger_unit_exited_incomplete",
    "visual_novel_unit_opened",
    "visual_novel_unit_completed",
    "visual_novel_unit_exited_incomplete",
    "visual_novel_unit_replay_started",
    "phone_call_unit_opened",
  ];

  // ⟨ADR-0086⟩ `app_update_required_shown`이 더해져 39다.
  test("AN1. 이벤트 이름은 39개이고 지운 여덟이 없다", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/analytics-event-names.ts"), "utf8");
    const names = [...source.matchAll(/^\s+\| "([a-z_]+)"/gm)].map((match) => match[1]);
    expect(names).toHaveLength(39);
    expect(names).toContain("episode_listen_item_answered");
    expect(names).toContain("app_update_required_shown");
    expect(names).toContain("episode_item_answered");
    for (const name of removedNames) expect(names).not.toContain(name);
  });

  test("AN1. 만들어 내는 sink는 entry · notification · settings · episodeIntro 넷뿐이다", () => {
    const { client } = fakeClient();
    expect(Object.keys(analyticsEventSinksFrom(client)).sort()).toEqual([
      "entryEventSink",
      "episodeIntroEventSink",
      "notificationEventSink",
      "settingsEventSink",
    ]);
  });
});

describe("noAnalyticsEventSinks / noAnalyticsSession", () => {
  test("AE3: 네 sink가 모두 null이다 — no-op 함수가 아니다", () => {
    expect(Object.keys(noAnalyticsEventSinks).sort()).toStrictEqual([...sinkKeys].sort());
    for (const key of sinkKeys) {
      expect(noAnalyticsEventSinks[key]).toBeNull();
    }
  });

  test("AE3: noAnalyticsSession은 sink 넷 null + user null이다(identify 자리 없음)", () => {
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
  test("AE4: null 클라이언트는 넷 모두 null이다", () => {
    const sinks = analyticsEventSinksFrom(null);
    expect(sinks).toStrictEqual(noAnalyticsEventSinks);
    for (const key of sinkKeys) {
      expect(sinks[key]).toBeNull();
    }
  });

  test("AE5: 네 sink가 이벤트 하나당 capture를 정확히 1회 부른다", () => {
    const { client, capture, identify } = fakeClient();
    const sinks = analyticsEventSinksFrom(client);
    const named = (name: AnalyticsEvent["name"]): AnalyticsEvent =>
      events.find((event) => event.name === name)!;
    const bySink: readonly (readonly [unknown, AnalyticsEvent])[] = [
      [sinks.entryEventSink, named("entry_screen_viewed")],
      [sinks.notificationEventSink, named("notifications_opened")],
      [sinks.settingsEventSink, named("settings_opened")],
      [sinks.episodeIntroEventSink, named("episode_intro_viewed")],
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

describe("episode_update_splash_closed", () => {
  const event = {
    name: "episode_update_splash_closed",
    outcome: "timed-out",
    waitMs: "3000",
    splashMs: "5400",
    episodeCount: "2",
    replacedCount: "1",
  } as const satisfies AnalyticsEvent;
  const properties = {
    outcome: "timed-out",
    waitMs: "3000",
    splashMs: "5400",
    episodeCount: "2",
    replacedCount: "1",
  };

  test("EV1. 이름은 그대로, properties는 name만 뺀 다섯 필드다", () => {
    expect(analyticsCaptureFrom(event)).toStrictEqual({
      event: "episode_update_splash_closed",
      properties,
    });
  });

  test("EV1. episodeIntroEventSink가 이 이벤트를 capture 한 번으로 보낸다", () => {
    const { client, capture } = fakeClient();
    const sink = analyticsEventSinksFrom(client).episodeIntroEventSink as unknown as (
      e: AnalyticsEvent,
    ) => void;

    sink(event);

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("episode_update_splash_closed", properties);
  });
});
