import { motion } from "@libitums/design-tokens";
import { describe, expect, it } from "vitest";

import {
  defaultMotion,
  motionClassName,
  motionDurationMs,
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

describe("motionDurationMs", () => {
  it("MD1. ms 문자열을 숫자로 바꾼다", () => {
    expect(motionDurationMs("35ms")).toBe(35);
    expect(motionDurationMs("1000ms")).toBe(1000);
    expect(motionDurationMs("150ms")).toBe(150);
  });

  it("MD2. s 문자열을 ms로 환산한다", () => {
    expect(motionDurationMs("0.3s")).toBe(300);
    expect(motionDurationMs("1s")).toBe(1000);
  });

  it("MD3. 토큰의 reveal · spinner 값을 읽는다", () => {
    expect(motionDurationMs(motion.duration.reveal)).toBe(35);
    expect(motionDurationMs(motion.duration.spinner)).toBe(1000);
  });

  it.each(["35", "abc", "", " 35ms", "-5ms"])("MD4. 형식이 아닌 %j는 던진다", (value) => {
    expect(() => motionDurationMs(value as never)).toThrow();
  });
});
