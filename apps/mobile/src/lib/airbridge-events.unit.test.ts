import { describe, expect, test, vi } from "vitest";

import type { AnalyticsEventSinks } from "./analytics.contract";
import { airbridgeEventFrom, withAirbridgeEvents } from "./airbridge-events";
import {
  allEventNames,
  entryCompleted,
  messengerJourneyDone,
  messengerRoleplayDone,
  nullSinks,
  unmappedEvents,
  visualNovelJourneyDone,
  visualNovelRoleplayDone,
} from "./airbridge-events.test-support";

function liveSinks(order: string[] = []) {
  const fns = {
    entry: vi.fn<() => void>(() => void order.push("sink")),
    messenger: vi.fn<() => void>(() => void order.push("sink")),
    visualNovel: vi.fn<() => void>(() => void order.push("sink")),
    phoneCall: vi.fn<() => void>(),
    notification: vi.fn<() => void>(),
    settings: vi.fn<() => void>(),
    episodeIntro: vi.fn<() => void>(),
  };
  const sinks: AnalyticsEventSinks = {
    entryEventSink: fns.entry,
    messengerEventSink: fns.messenger,
    visualNovelEventSink: fns.visualNovel,
    phoneCallEventSink: fns.phoneCall,
    notificationEventSink: fns.notification,
    settingsEventSink: fns.settings,
    episodeIntroEventSink: fns.episodeIntro,
  };
  return { sinks, fns };
}

describe("airbridgeEventFrom", () => {
  test("U1. entry_completed maps to signup with zero parameter keys", () => {
    const mapped = airbridgeEventFrom(entryCompleted);
    expect(mapped).toEqual({ category: "airbridge.user.signup", semanticAttributes: {} });
    expect(Object.keys(mapped?.semanticAttributes ?? { x: 1 })).toHaveLength(0);
  });

  test.each([
    ["messenger", messengerJourneyDone, "appointment-confirmation"],
    ["visual_novel", visualNovelJourneyDone, "cafe-arrival-visual-novel"],
  ] as const)("U2. journey %s completion maps to achieveLevel", (contentType, event, unitId) => {
    const mapped = airbridgeEventFrom(event);
    expect(mapped).toStrictEqual({
      category: "airbridge.achieveLevel",
      semanticAttributes: { level: unitId, label: contentType },
    });
    expect(Object.keys(mapped?.semanticAttributes ?? {})).toHaveLength(2);
  });

  test("U3. the 40 table rows plus the three mapped names cover all 43 names", () => {
    const tableNames = new Set<string>(unmappedEvents.map((e) => e.name));
    const mapped = ["entry_completed", "messenger_unit_completed", "visual_novel_unit_completed"];
    expect(tableNames.size).toBe(40);
    expect([...tableNames, ...mapped].sort()).toEqual([...allEventNames].sort());
  });

  test.each(unmappedEvents.map((e) => [e.name, e] as const))(
    "U3. %s maps to null",
    (_name, event) => {
      expect(airbridgeEventFrom(event)).toBeNull();
    },
  );

  test.each([
    ["messenger_unit_completed", messengerRoleplayDone],
    ["visual_novel_unit_completed", visualNovelRoleplayDone],
  ] as const)("U4. roleplay-sourced %s maps to null", (_name, event) => {
    expect(airbridgeEventFrom(event)).toBeNull();
  });

  test("U5. frozen input is accepted and results are fresh equal objects", () => {
    for (const event of [entryCompleted, messengerJourneyDone, visualNovelJourneyDone]) {
      const frozen = Object.freeze({ ...event });
      let first: ReturnType<typeof airbridgeEventFrom> = null;
      let second: ReturnType<typeof airbridgeEventFrom> = null;
      expect(() => {
        first = airbridgeEventFrom(frozen);
        second = airbridgeEventFrom(frozen);
      }).not.toThrow();
      expect(first).not.toBeNull();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(frozen).toEqual(event);
    }
  });

  test("U6. attributes hold only the content keys, string values and the airbridge prefix", () => {
    for (const event of [entryCompleted, messengerJourneyDone, visualNovelJourneyDone]) {
      const mapped = airbridgeEventFrom(event);
      expect(mapped).not.toBeNull();
      const keys = Object.keys(mapped?.semanticAttributes ?? {}).sort();
      expect([[], ["label", "level"]]).toContainEqual(keys);
      expect(mapped?.category.startsWith("airbridge.")).toBe(true);
      for (const value of Object.values(mapped?.semanticAttributes ?? {})) {
        expect(typeof value).toBe("string");
      }
    }
  });
});

describe("withAirbridgeEvents", () => {
  test("U7. a throwing original sink does not stop the tracker or the caller", () => {
    const { sinks, fns } = liveSinks();
    fns.entry.mockImplementation(() => {
      throw new Error("posthog down");
    });
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(sinks, tracker);
    expect(() => composed.entryEventSink?.(entryCompleted)).not.toThrow();
    expect(tracker).toHaveBeenCalledTimes(1);
  });

  test("U8. a throwing tracker runs after the original sink and does not escape", () => {
    const { sinks, fns } = liveSinks();
    const tracker = vi.fn<() => void>(() => {
      throw new Error("host down");
    });
    const composed = withAirbridgeEvents(sinks, tracker);
    expect(() => composed.entryEventSink?.(entryCompleted)).not.toThrow();
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(tracker).toHaveBeenCalledTimes(1);
  });

  test("U9. with all seven sinks null the three forwarded ones still reach the tracker", () => {
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(nullSinks, tracker);
    expect(typeof composed.entryEventSink).toBe("function");
    expect(typeof composed.messengerEventSink).toBe("function");
    expect(typeof composed.visualNovelEventSink).toBe("function");
    expect(composed.phoneCallEventSink).toBeNull();
    expect(composed.notificationEventSink).toBeNull();
    expect(composed.settingsEventSink).toBeNull();
    expect(composed.episodeIntroEventSink).toBeNull();
    composed.entryEventSink?.(entryCompleted);
    expect(tracker).toHaveBeenCalledTimes(1);
  });

  test("U10. a null tracker returns the very same sinks reference", () => {
    const { sinks } = liveSinks();
    expect(withAirbridgeEvents(sinks, null)).toBe(sinks);
    expect(withAirbridgeEvents(nullSinks, null)).toBe(nullSinks);
  });

  test("U11. the four non-forwarded sinks keep their reference", () => {
    const { sinks } = liveSinks();
    const composed = withAirbridgeEvents(sinks, vi.fn<() => void>());
    expect(composed.phoneCallEventSink).toBe(sinks.phoneCallEventSink);
    expect(composed.notificationEventSink).toBe(sinks.notificationEventSink);
    expect(composed.settingsEventSink).toBe(sinks.settingsEventSink);
    expect(composed.episodeIntroEventSink).toBe(sinks.episodeIntroEventSink);
  });

  test("U12. a mapped event calls the original sink once then the tracker once", () => {
    const order: string[] = [];
    const { sinks, fns } = liveSinks(order);
    const tracker = vi.fn<() => void>(() => void order.push("tracker"));
    const composed = withAirbridgeEvents(sinks, tracker);
    composed.entryEventSink?.(entryCompleted);
    composed.messengerEventSink?.(messengerJourneyDone);
    composed.visualNovelEventSink?.(visualNovelJourneyDone);
    expect(order).toEqual(["sink", "tracker", "sink", "tracker", "sink", "tracker"]);
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(fns.messenger).toHaveBeenCalledTimes(1);
    expect(fns.visualNovel).toHaveBeenCalledTimes(1);
    expect(tracker).toHaveBeenCalledTimes(3);
    expect(tracker).toHaveBeenNthCalledWith(1, {
      category: "airbridge.user.signup",
      semanticAttributes: {},
    });
  });

  test("U12. an unmapped event reaches the original sink once and the tracker never", () => {
    const { sinks, fns } = liveSinks();
    const tracker = vi.fn<() => void>();
    const composed = withAirbridgeEvents(sinks, tracker);
    composed.entryEventSink?.({ name: "entry_screen_viewed", screen: "onboarding" });
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(tracker).not.toHaveBeenCalled();
  });
});
