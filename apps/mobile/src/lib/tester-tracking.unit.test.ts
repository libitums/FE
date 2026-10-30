import { afterEach, expect, test, vi } from "vitest";

import type { AnalyticsEventSinks } from "./analytics.contract";
import type { AnalyticsUser } from "./analytics-user.contract";
import {
  createTesterTrackingSync,
  setHostTrackingEnabled,
  withoutTesterIdentify,
  withoutTesterEvents,
} from "./tester-tracking";

// 시험 계정은 PostHog · Airbridge로 추적하지 않는다(ADR-0085 D4). Sentry는 이 경로 밖이다.

afterEach(() => {
  vi.unstubAllGlobals();
});

function recordingSinks() {
  const seen: string[] = [];
  const sinks: AnalyticsEventSinks = {
    entryEventSink: (event) => seen.push(`entry:${event.name}`),
    notificationEventSink: (event) => seen.push(`notification:${event.name}`),
    settingsEventSink: (event) => seen.push(`settings:${event.name}`),
    episodeIntroEventSink: (event) => seen.push(`intro:${event.name}`),
  };
  return { seen, sinks };
}

function recordingUser() {
  const calls: string[] = [];
  const user: AnalyticsUser = {
    identify: (userId) => calls.push(`identify:${userId}`),
    reset: (scope) => calls.push(`reset:${scope}`),
  };
  return { calls, user };
}

test("TT1. 시험 계정이면 sink 넷 모두 버리고, 아니면 그대로 넘긴다 — 판정은 부를 때마다 읽는다", () => {
  const { seen, sinks } = recordingSinks();
  let tester = true;
  const gated = withoutTesterEvents(sinks, () => tester);
  const entry = { name: "entry_completed" } as Parameters<
    NonNullable<typeof sinks.entryEventSink>
  >[0];
  const intro = { name: "episode_final_passed", episodeId: "u01" } as Parameters<
    NonNullable<typeof sinks.episodeIntroEventSink>
  >[0];

  gated.entryEventSink?.(entry);
  gated.episodeIntroEventSink?.(intro);
  expect(seen).toEqual([]);

  tester = false;
  gated.entryEventSink?.(entry);
  gated.episodeIntroEventSink?.(intro);
  expect(seen).toEqual(["entry:entry_completed", "intro:episode_final_passed"]);
});

test("TT2. 없는 sink(null)는 null 그대로다", () => {
  const sinks: AnalyticsEventSinks = {
    entryEventSink: null,
    notificationEventSink: null,
    settingsEventSink: null,
    episodeIntroEventSink: null,
  };
  expect(withoutTesterEvents(sinks, () => false)).toEqual(sinks);
});

test("TT3. 시험 계정이면 식별하지 않고, 되돌리기는 늘 넘긴다 · 사용자 자리가 없으면 null", () => {
  const { calls, user } = recordingUser();
  let tester = true;
  const gated = withoutTesterIdentify(user, () => tester);

  gated?.identify("u-1");
  gated?.reset("identity");
  tester = false;
  gated?.identify("u-2");

  expect(calls).toEqual(["reset:identity", "identify:u-2"]);
  expect(withoutTesterIdentify(null, () => false)).toBeNull();
});

test("TT4. 표시가 바뀔 때만 호스트를 부른다 — 켜지면 멈추고 대기열 · 식별을 버리며, 꺼지면 다시 잰다", () => {
  const host: boolean[] = [];
  vi.stubGlobal("NativeModules", {
    AirbridgeEventsModule: { setTrackingEnabled: (enabled: boolean) => host.push(enabled) },
  });
  const { calls, user } = recordingUser();
  const sync = createTesterTrackingSync();

  sync(false, user);
  sync(false, user);
  sync(true, user);
  sync(true, user);
  sync(false, user);

  expect(host).toEqual([true, false, true]);
  expect(calls).toEqual(["reset:identity-and-queue"]);
});

test("TT5. 첫 판정이 시험 계정이어도 멈추고 버린다 · 사용자 자리가 없어도 호스트는 부른다", () => {
  const host: boolean[] = [];
  vi.stubGlobal("NativeModules", {
    AirbridgeEventsModule: { setTrackingEnabled: (enabled: boolean) => host.push(enabled) },
  });
  const sync = createTesterTrackingSync();

  sync(true, null);

  expect(host).toEqual([false]);
});

test.each([
  ["NativeModules 없음", undefined],
  ["모듈 없음(값 없는 빌드)", {}],
  ["메서드 없음(옛 호스트)", { AirbridgeEventsModule: { trackEvent: () => undefined } }],
  [
    "호스트가 던짐",
    {
      AirbridgeEventsModule: {
        setTrackingEnabled: () => {
          throw new Error("host failed");
        },
      },
    },
  ],
])("TT6. %s이면 false이고 던지지 않는다", (_name, modules) => {
  vi.stubGlobal("NativeModules", modules);

  expect(setHostTrackingEnabled(false)).toBe(false);
});
