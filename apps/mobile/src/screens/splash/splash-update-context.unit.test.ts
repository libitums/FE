import { describe, expect, it } from "vitest";

import * as splashUpdateContext from "./splash-update-context";
import {
  plainSplashUpdate,
  splashGaugeFillWidth,
  splashMayLeave,
  splashUpdateClassName,
} from "./splash-update-context";
import type { SplashCopy, SplashUpdateView } from "./splash.contract";

describe("splash-update-context", () => {
  it("[SX1] splashMayLeave: plain · gauge release는 나가도 되고 gauge wait는 안 된다", () => {
    expect(splashMayLeave({ kind: "plain" })).toBe(true);
    expect(splashMayLeave({ kind: "gauge", percent: 40, hold: "wait" })).toBe(false);
    expect(splashMayLeave({ kind: "gauge", percent: 100, hold: "release" })).toBe(true);
  });

  it("[SX2] splashGaugeFillWidth: 0 이하 · NaN은 null, 소수는 내림, 100 이상은 100%", () => {
    expect(splashGaugeFillWidth(0)).toBeNull();
    expect(splashGaugeFillWidth(-3)).toBeNull();
    expect(splashGaugeFillWidth(Number.NaN)).toBeNull();
    expect(splashGaugeFillWidth(37.8)).toBe("37%");
    expect(splashGaugeFillWidth(100)).toBe("100%");
    expect(splashGaugeFillWidth(140)).toBe("100%");
  });

  it("[SX3] splashUpdateClassName은 모션별 클래스를 내고, plainSplashUpdate는 plain이며 함수는 던지지 않는다", () => {
    expect(splashUpdateClassName("standard")).toBe("splash-update");
    expect(splashUpdateClassName("reduced")).toBe("splash-update splash-update-motion-reduced");
    expect(plainSplashUpdate.view).toEqual({ kind: "plain" });
    expect(() => plainSplashUpdate.logoFinished()).not.toThrow();
    expect(() => plainSplashUpdate.close()).not.toThrow();
  });

  it("[SX4] splashUpdateAnnouncement: gauge이고 아직 알리지 않았을 때만 퍼센트 없는 copy.updating을 낸다", () => {
    const exported: Record<string, unknown> = splashUpdateContext;
    expect(typeof exported["splashUpdateAnnouncement"]).toBe("function");
    const announce = exported["splashUpdateAnnouncement"] as (
      view: SplashUpdateView,
      announced: "yes" | "no",
      copy: SplashCopy,
    ) => string | null;
    const copy: SplashCopy = {
      updating: "Updating episodes",
      updatingLabel: (percent) => `Updating episodes, ${percent}%`,
    };
    const views: SplashUpdateView[] = [
      { kind: "gauge", percent: 0, hold: "wait" },
      { kind: "gauge", percent: 40, hold: "wait" },
      { kind: "gauge", percent: 100, hold: "release" },
    ];

    for (const view of views) {
      expect(announce(view, "no", copy)).toBe("Updating episodes");
      expect(announce(view, "yes", copy)).toBeNull();
    }
    expect(announce({ kind: "gauge", percent: 40, hold: "wait" }, "no", copy)).not.toContain("%");
    expect(announce({ kind: "plain" }, "no", copy)).toBeNull();
    expect(announce({ kind: "plain" }, "yes", copy)).toBeNull();
  });
});
