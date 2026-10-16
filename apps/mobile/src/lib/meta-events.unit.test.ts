import { describe, expect, test, vi } from "vitest";

import type { AnalyticsEventSinks } from "./analytics.contract";
import { metaAppEventFrom, withMetaAppEvents } from "./meta-events";
import {
  allEventNames,
  entryCompleted,
  messengerJourneyDone,
  messengerRoleplayDone,
  nullSinks,
  unmappedEvents,
  visualNovelJourneyDone,
  visualNovelRoleplayDone,
} from "./meta-events.test-support";

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

describe("metaAppEventFrom", () => {
  test("U1. entry_completed maps to registration with zero parameter keys", () => {
    const mapped = metaAppEventFrom(entryCompleted);
    expect(mapped).toEqual({ name: "fb_mobile_complete_registration", parameters: {} });
    expect(Object.keys(mapped?.parameters ?? { x: 1 })).toHaveLength(0);
  });

  test.each([
    ["messenger", messengerJourneyDone, "appointment-confirmation"],
    ["visual_novel", visualNovelJourneyDone, "cafe-arrival-visual-novel"],
  ] as const)("U2. journey %s completion maps to level achieved", (contentType, event, unitId) => {
    const mapped = metaAppEventFrom(event);
    expect(mapped).toStrictEqual({
      name: "fb_mobile_level_achieved",
      parameters: { fb_level: unitId, fb_content_type: contentType },
    });
    expect(Object.keys(mapped?.parameters ?? {})).toHaveLength(2);
  });

  test("U3. the 30 table names plus the three mapped names cover all 33 names", () => {
    const tableNames = new Set<string>(unmappedEvents.map((e) => e.name));
    const mapped = ["entry_completed", "messenger_unit_completed", "visual_novel_unit_completed"];
    expect(tableNames.size).toBe(30);
    expect([...tableNames, ...mapped].sort()).toEqual([...allEventNames].sort());
  });

  test.each(unmappedEvents.map((e) => [e.name, e] as const))(
    "U3. %s maps to null",
    (_name, event) => {
      expect(metaAppEventFrom(event)).toBeNull();
    },
  );

  test.each([
    ["messenger_unit_completed", messengerRoleplayDone],
    ["visual_novel_unit_completed", visualNovelRoleplayDone],
  ] as const)("U4. roleplay-sourced %s maps to null", (_name, event) => {
    expect(metaAppEventFrom(event)).toBeNull();
  });

  test("U5. frozen input is accepted and results are fresh equal objects", () => {
    for (const event of [entryCompleted, messengerJourneyDone, visualNovelJourneyDone]) {
      const frozen = Object.freeze({ ...event });
      let first: ReturnType<typeof metaAppEventFrom> = null;
      let second: ReturnType<typeof metaAppEventFrom> = null;
      expect(() => {
        first = metaAppEventFrom(frozen);
        second = metaAppEventFrom(frozen);
      }).not.toThrow();
      expect(first).not.toBeNull();
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(frozen).toEqual(event);
    }
  });

  test("U6. parameters hold only the content keys and string values", () => {
    for (const event of [entryCompleted, messengerJourneyDone, visualNovelJourneyDone]) {
      const mapped = metaAppEventFrom(event);
      expect(mapped).not.toBeNull();
      const keys = Object.keys(mapped?.parameters ?? {}).sort();
      expect([[], ["fb_content_type", "fb_level"]]).toContainEqual(keys);
      for (const value of Object.values(mapped?.parameters ?? {})) {
        expect(typeof value).toBe("string");
      }
    }
  });
});

describe("withMetaAppEvents", () => {
  test("U7. a throwing original sink does not stop the logger or the caller", () => {
    const { sinks, fns } = liveSinks();
    fns.entry.mockImplementation(() => {
      throw new Error("posthog down");
    });
    const logger = vi.fn<() => void>();
    const composed = withMetaAppEvents(sinks, logger);
    expect(() => composed.entryEventSink?.(entryCompleted)).not.toThrow();
    expect(logger).toHaveBeenCalledTimes(1);
  });

  test("U8. a throwing logger runs after the original sink and does not escape", () => {
    const { sinks, fns } = liveSinks();
    const logger = vi.fn<() => void>(() => {
      throw new Error("host down");
    });
    const composed = withMetaAppEvents(sinks, logger);
    expect(() => composed.entryEventSink?.(entryCompleted)).not.toThrow();
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledTimes(1);
  });

  test("U9. with all seven sinks null the three forwarded ones still reach the logger", () => {
    const logger = vi.fn<() => void>();
    const composed = withMetaAppEvents(nullSinks, logger);
    expect(typeof composed.entryEventSink).toBe("function");
    expect(typeof composed.messengerEventSink).toBe("function");
    expect(typeof composed.visualNovelEventSink).toBe("function");
    expect(composed.phoneCallEventSink).toBeNull();
    expect(composed.notificationEventSink).toBeNull();
    expect(composed.settingsEventSink).toBeNull();
    expect(composed.episodeIntroEventSink).toBeNull();
    composed.entryEventSink?.(entryCompleted);
    expect(logger).toHaveBeenCalledTimes(1);
  });

  test("U10. a null logger returns the very same sinks reference", () => {
    const { sinks } = liveSinks();
    expect(withMetaAppEvents(sinks, null)).toBe(sinks);
    expect(withMetaAppEvents(nullSinks, null)).toBe(nullSinks);
  });

  test("U11. the four non-forwarded sinks keep their reference", () => {
    const { sinks } = liveSinks();
    const composed = withMetaAppEvents(sinks, vi.fn<() => void>());
    expect(composed.phoneCallEventSink).toBe(sinks.phoneCallEventSink);
    expect(composed.notificationEventSink).toBe(sinks.notificationEventSink);
    expect(composed.settingsEventSink).toBe(sinks.settingsEventSink);
    expect(composed.episodeIntroEventSink).toBe(sinks.episodeIntroEventSink);
  });

  test("U12. a mapped event calls the original sink once then the logger once", () => {
    const order: string[] = [];
    const { sinks, fns } = liveSinks(order);
    const logger = vi.fn<() => void>(() => void order.push("logger"));
    const composed = withMetaAppEvents(sinks, logger);
    composed.entryEventSink?.(entryCompleted);
    composed.messengerEventSink?.(messengerJourneyDone);
    composed.visualNovelEventSink?.(visualNovelJourneyDone);
    expect(order).toEqual(["sink", "logger", "sink", "logger", "sink", "logger"]);
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(fns.messenger).toHaveBeenCalledTimes(1);
    expect(fns.visualNovel).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledTimes(3);
    expect(logger).toHaveBeenNthCalledWith(1, {
      name: "fb_mobile_complete_registration",
      parameters: {},
    });
  });

  test("U12. an unmapped event reaches the original sink once and the logger never", () => {
    const { sinks, fns } = liveSinks();
    const logger = vi.fn<() => void>();
    const composed = withMetaAppEvents(sinks, logger);
    composed.entryEventSink?.({ name: "entry_screen_viewed", screen: "onboarding" });
    expect(fns.entry).toHaveBeenCalledTimes(1);
    expect(logger).not.toHaveBeenCalled();
  });
});
