import { describe, expect, it } from "vitest";

import {
  defaultMotion,
  motionClassName,
  motionFromReducedMotion,
  resolveMotion,
  resolveReducedMotion,
} from "./motion.contract";

describe("motion.contract", () => {
  it("MO1. 명시가 없거나 컨텍스트가 reduced면 reduced가 된다", () => {
    expect(resolveMotion(undefined, "reduced")).toBe("reduced");
    expect(resolveMotion("reduced", "standard")).toBe("reduced");
  });

  it("MO2. 명시 standard가 컨텍스트 reduced를 이긴다", () => {
    expect(resolveMotion("standard", "reduced")).toBe("standard");
  });

  it("MO3. resolveReducedMotion은 boolean 명시를 우선하고 아니면 컨텍스트를 따른다", () => {
    expect(resolveReducedMotion(undefined, "reduced")).toBe(true);
    expect(resolveReducedMotion(false, "reduced")).toBe(false);
    expect(resolveReducedMotion(true, "standard")).toBe(true);
  });

  it("MO4. 잘못된 값과 standard 기본은 standard · false이고 던지지 않는다", () => {
    expect(() => resolveMotion("bogus" as never, "standard")).not.toThrow();
    expect(resolveMotion("bogus" as never, "standard")).toBe("standard");
    expect(resolveMotion(undefined, "standard")).toBe("standard");
    expect(resolveReducedMotion(undefined, "standard")).toBe(false);
  });

  it("MO5. motionFromReducedMotion · motionClassName · defaultMotion", () => {
    expect(motionFromReducedMotion(true)).toBe("reduced");
    expect(motionFromReducedMotion(false)).toBe("standard");
    expect(motionClassName("ui-lynx-x", "reduced")).toBe("ui-lynx-x-motion-reduced");
    expect(motionClassName("ui-lynx-x", "standard")).toBeUndefined();
    expect(defaultMotion).toBe("standard");
  });
});
