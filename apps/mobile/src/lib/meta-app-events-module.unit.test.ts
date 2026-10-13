import { afterEach, describe, expect, test, vi } from "vitest";

import {
  metaAppEventsModuleName,
  productEventSinks,
  resolveMetaAppEventLogger,
} from "./meta-app-events-module";
import { entryCompleted, nullSinks } from "./meta-events.test-support";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveMetaAppEventLogger", () => {
  test.each([
    ["NativeModules is undefined", undefined],
    ["NativeModules is null", null],
    ["the module is absent", {}],
    ["logEvent is not a function", { MetaAppEventsModule: { logEvent: "nope" } }],
  ] as const)("U13. %s resolves to null without throwing", (_label, nativeModules) => {
    vi.stubGlobal("NativeModules", nativeModules);
    let logger: ReturnType<typeof resolveMetaAppEventLogger> = null;
    expect(() => {
      logger = resolveMetaAppEventLogger();
    }).not.toThrow();
    expect(logger).toBeNull();
  });

  test("U14. the logger forwards name and parameters to logEvent exactly once", () => {
    const logEvent = vi.fn<(name: string, parameters: object) => void>();
    vi.stubGlobal("NativeModules", { MetaAppEventsModule: { logEvent } });
    const logger = resolveMetaAppEventLogger();
    expect(logger).toBeTypeOf("function");
    const event = {
      name: "fb_mobile_level_achieved",
      parameters: { fb_level: "appointment-confirmation", fb_content_type: "messenger" },
    } as const;
    logger?.(event);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(event.name, event.parameters);
  });
});

describe("metaAppEventsModuleName", () => {
  test("U15. the module name constant", () => {
    expect(metaAppEventsModuleName).toBe("MetaAppEventsModule");
  });
});

describe("productEventSinks", () => {
  test("U16. without the host module the sinks come back as the same reference", () => {
    vi.stubGlobal("NativeModules", {});
    expect(productEventSinks(nullSinks)).toBe(nullSinks);
  });

  test("U16. with the host module an entry_completed reaches logEvent once", () => {
    const logEvent = vi.fn<(name: string, parameters: object) => void>();
    vi.stubGlobal("NativeModules", { MetaAppEventsModule: { logEvent } });
    const composed = productEventSinks(nullSinks);
    composed.entryEventSink?.(entryCompleted);
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith("fb_mobile_complete_registration", {});
  });
});
