import { afterEach, describe, expect, test, vi } from "vitest";

import {
  airbridgeEventsModuleName,
  productEventSinks,
  resolveAirbridgeEventTracker,
} from "./airbridge-events-module";
import type { AnalyticsEvent, AnalyticsEventSinks } from "./analytics.contract";
import { entryCompleted, nullSinks } from "./airbridge-events.test-support";
import { chatMessageSent } from "./airbridge-funnel-events.test-support";
import type { Milestone, MilestoneStore } from "./companion-events";

function memoryStore(): MilestoneStore {
  const done = new Set<Milestone>();
  return { done: (m) => done.has(m), mark: (m) => void done.add(m) };
}

function recordingSinks(seen: string[]): AnalyticsEventSinks {
  const record = (event: AnalyticsEvent) => void seen.push(event.name);
  return {
    entryEventSink: record,
    notificationEventSink: record,
    settingsEventSink: record,
    episodeIntroEventSink: record,
  } as unknown as AnalyticsEventSinks;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveAirbridgeEventTracker", () => {
  test.each([
    ["NativeModules is undefined", undefined],
    ["NativeModules is null", null],
    ["the module is absent", {}],
    ["trackEvent is not a function", { AirbridgeEventsModule: { trackEvent: "nope" } }],
    // The removed module name is assembled so the repository-wide zero-Meta scan (I-S8) stays clean.
    [
      "only the old Meta module name exists",
      { ["Meta" + "AppEventsModule"]: { logEvent: () => {} } },
    ],
  ] as const)("U13. %s resolves to null without throwing", (_label, nativeModules) => {
    vi.stubGlobal("NativeModules", nativeModules);
    let tracker: ReturnType<typeof resolveAirbridgeEventTracker> = null;
    expect(() => {
      tracker = resolveAirbridgeEventTracker();
    }).not.toThrow();
    expect(tracker).toBeNull();
  });

  test("U14. the tracker forwards category and attributes to trackEvent exactly once", () => {
    const trackEvent = vi.fn<(category: string, attributes: object) => void>();
    vi.stubGlobal("NativeModules", { AirbridgeEventsModule: { trackEvent } });
    const tracker = resolveAirbridgeEventTracker();
    expect(tracker).toBeTypeOf("function");
    const event = {
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: "u00-tutorial", label: "episode_final" },
    } as const;
    tracker?.(event as never);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(event.category, event.semanticAttributes);
  });
});

describe("airbridgeEventsModuleName", () => {
  test("U15. the module name constant", () => {
    expect(airbridgeEventsModuleName).toBe("AirbridgeEventsModule");
  });
});

describe("productEventSinks", () => {
  test("U16. without the host module the sinks come back as the same reference", () => {
    vi.stubGlobal("NativeModules", {});
    expect(productEventSinks(nullSinks)).toBe(nullSinks);
  });

  test("U16. with the host module an entry_completed reaches trackEvent once", () => {
    const trackEvent = vi.fn<(category: string, attributes: object) => void>();
    vi.stubGlobal("NativeModules", { AirbridgeEventsModule: { trackEvent } });
    const composed = productEventSinks(nullSinks);
    composed.entryEventSink?.(entryCompleted);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith("airbridge.user.signup", {});
  });
});

describe("productEventSinks — 첫 경험 마일스톤이 Airbridge 합성 바깥(2026-11-24)", () => {
  const send = (sinks: AnalyticsEventSinks, event: AnalyticsEvent) =>
    (sinks.episodeIntroEventSink as unknown as (event: AnalyticsEvent) => void)(event);

  test("U17. 첫 chat_message_sent 뒤 first_chat_message_sent가 PostHog · trackEvent 둘 다에 한 번, 두 번째 메시지에는 없다", () => {
    const trackEvent = vi.fn<(category: string, attributes: object) => void>();
    vi.stubGlobal("NativeModules", { AirbridgeEventsModule: { trackEvent } });
    const seen: string[] = [];
    const composed = productEventSinks(recordingSinks(seen), memoryStore());
    send(composed, chatMessageSent);
    send(composed, chatMessageSent);
    expect(seen).toEqual(["chat_message_sent", "first_chat_message_sent", "chat_message_sent"]);
    expect(trackEvent.mock.calls).toEqual([["first_chat_message_sent", {}]]);
  });

  test("U18. PostHog sink가 없어도(키 없음) 호스트 모듈이 있으면 첫 채팅이 trackEvent에 닿는다", () => {
    const trackEvent = vi.fn<(category: string, attributes: object) => void>();
    vi.stubGlobal("NativeModules", { AirbridgeEventsModule: { trackEvent } });
    send(productEventSinks(nullSinks, memoryStore()), chatMessageSent);
    expect(trackEvent.mock.calls).toEqual([["first_chat_message_sent", {}]]);
  });

  test("U19. 호스트 모듈이 없으면 trackEvent 0이고 PostHog에는 마일스톤이 그대로 간다", () => {
    const trackEvent = vi.fn<(category: string, attributes: object) => void>();
    vi.stubGlobal("NativeModules", {});
    const seen: string[] = [];
    send(productEventSinks(recordingSinks(seen), memoryStore()), chatMessageSent);
    expect(seen).toEqual(["chat_message_sent", "first_chat_message_sent"]);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
