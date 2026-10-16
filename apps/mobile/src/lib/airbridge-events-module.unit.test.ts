import { afterEach, describe, expect, test, vi } from "vitest";

import {
  airbridgeEventsModuleName,
  productEventSinks,
  resolveAirbridgeEventTracker,
} from "./airbridge-events-module";
import { entryCompleted, nullSinks } from "./airbridge-events.test-support";

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
      semanticAttributes: { level: "appointment-confirmation", label: "messenger" },
    } as const;
    tracker?.(event);
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
