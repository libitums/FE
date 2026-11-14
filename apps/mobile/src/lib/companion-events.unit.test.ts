import { afterEach, describe, expect, test, vi } from "vitest";

import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import {
  deviceMilestoneStore,
  emitCompanionEvent,
  milestoneFor,
  milestonesStorageKey,
  personOnceFor,
  withFirstMilestones,
  type Milestone,
  type MilestoneStore,
} from "./companion-events";
import { nullSinks } from "./airbridge-events.test-support";

// 엽전 · 메신저 · 영역 이벤트를 보내는 자리와 첫 경험 마일스톤(ADR-0029 「D3 목적 구분」)의 순수 동작입니다.

const memoryStore = (): MilestoneStore => {
  const seen = new Set<Milestone>();
  return { done: (m) => seen.has(m), mark: (m) => void seen.add(m) };
};

const passed: AnalyticsEvent = {
  name: "episode_lesson_finished",
  episodeId: "u01",
  unitKey: "S1",
  unitRole: "lesson",
  verdict: "passed",
  correctCount: "3",
  questionCount: "3",
  skippedCount: "0",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("emitCompanionEvent", () => {
  test("EV-U1 날 수를 붙여 보내고, sink가 없으면 아무것도 하지 않는다", () => {
    const events: AnalyticsEvent[] = [];
    emitCompanionEvent(
      (e) => events.push(e),
      { name: "launch_coins_closed", surface: "learning" },
      () => "4",
    );
    expect(events).toEqual([
      { name: "launch_coins_closed", surface: "learning", daysSinceFirstOpen: "4" },
    ]);
    expect(() =>
      emitCompanionEvent(null, { name: "launch_coins_closed", surface: "learning" }),
    ).not.toThrow();
  });
});

describe("milestoneFor · personOnceFor", () => {
  test("EV-U2 통과한 레슨 · 보낸 메시지만 마일스톤이다", () => {
    expect(milestoneFor(passed)).toEqual({ name: "first_lesson_completed", surface: "learning" });
    expect(milestoneFor({ ...passed, verdict: "failed" } as AnalyticsEvent)).toBeNull();
    expect(
      milestoneFor({
        name: "chat_message_sent",
        surface: "chat",
        daysSinceFirstOpen: "1",
        characterId: "duksu",
        paid: false,
        cost: "0",
      }),
    ).toEqual({ name: "first_chat_message_sent", surface: "chat", characterId: "duksu" });
    expect(milestoneFor({ name: "settings_opened" })).toBeNull();
  });

  test("EV-U3 마일스톤 이벤트만 첫 날 수(정수)를 사람 속성으로 싣는다", () => {
    expect(personOnceFor("first_lesson_completed", { daysSinceFirstOpen: "2" })).toEqual({
      first_lesson_day: 2,
    });
    expect(personOnceFor("first_chat_message_sent", { daysSinceFirstOpen: "0" })).toEqual({
      first_chat_day: 0,
    });
    expect(personOnceFor("chat_message_sent", { daysSinceFirstOpen: "0" })).toBeNull();
    expect(personOnceFor("first_lesson_completed", {})).toBeNull();
  });
});

describe("withFirstMilestones", () => {
  test("EV-U4 첫 통과 레슨 뒤에 first_lesson_completed를 한 번만 더 낸다", () => {
    const events: AnalyticsEvent[] = [];
    const sinks = withFirstMilestones(
      { ...nullSinks, episodeIntroEventSink: (e) => events.push(e) } as AnalyticsEventSinks,
      memoryStore(),
      () => "3",
    );
    sinks.episodeIntroEventSink?.(passed);
    sinks.episodeIntroEventSink?.(passed);
    expect(events.map((e) => e.name)).toEqual([
      "episode_lesson_finished",
      "first_lesson_completed",
      "episode_lesson_finished",
    ]);
    expect(events[1]).toEqual({
      name: "first_lesson_completed",
      surface: "learning",
      daysSinceFirstOpen: "3",
    });
  });

  test("EV-U5 sink가 없으면 감싸지 않는다", () => {
    expect(withFirstMilestones(nullSinks, memoryStore())).toBe(nullSinks);
  });

  test("EV-U6 기기 판은 저장소에 적어 다음 실행에도 한 번을 지킨다", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (k: string) => store.get(k) ?? null,
        set: (k: string, v: string) => void store.set(k, v),
        remove: (k: string) => void store.delete(k),
      },
    });
    deviceMilestoneStore().mark("first_chat_message_sent");
    expect(JSON.parse(store.get(milestonesStorageKey) ?? "[]")).toEqual([
      "first_chat_message_sent",
    ]);
    expect(deviceMilestoneStore().done("first_chat_message_sent")).toBe(true);
    expect(deviceMilestoneStore().done("first_lesson_completed")).toBe(false);
  });
});
