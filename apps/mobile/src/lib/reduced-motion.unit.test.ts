import { expect, test } from "vitest";

import { reducedMotionFrom } from "./reduced-motion";
import { safeAreaInsetsFrom, tappableBottomInsetFrom } from "./safe-area";

const insets = { top: 48, bottom: 48, left: 0, right: 0 };

test("RM1. reducedMotion이 true이면 true다 (다른 키와 함께여도)", () => {
  expect(reducedMotionFrom({ reducedMotion: true })).toBe(true);
  expect(reducedMotionFrom({ safeAreaInsets: insets, reducedMotion: true })).toBe(true);
});

test("RM2. false이거나 키가 없으면 false다", () => {
  expect(reducedMotionFrom({ reducedMotion: false })).toBe(false);
  expect(reducedMotionFrom({})).toBe(false);
  expect(reducedMotionFrom({ safeAreaInsets: insets })).toBe(false);
});

test("RM3. 객체가 아닌 값이 와도 false이고 던지지 않는다", () => {
  for (const value of [undefined, null, "true", 1, []]) {
    expect(() => reducedMotionFrom(value)).not.toThrow();
    expect(reducedMotionFrom(value)).toBe(false);
  }
});

test("RM4. boolean true가 아닌 값(문자열 · 숫자 · 객체 · null)은 false다", () => {
  expect(reducedMotionFrom({ reducedMotion: "true" })).toBe(false);
  expect(reducedMotionFrom({ reducedMotion: 1 })).toBe(false);
  expect(reducedMotionFrom({ reducedMotion: {} })).toBe(false);
  expect(reducedMotionFrom({ reducedMotion: null })).toBe(false);
});

test("RM5. reducedMotion 키가 함께 와도 safeAreaInsetsFrom · tappableBottomInsetFrom 값은 그대로다", () => {
  const withMotion = { safeAreaInsets: insets, tappableBottomInset: 48, reducedMotion: true };
  const without = { safeAreaInsets: insets, tappableBottomInset: 48 };
  expect(safeAreaInsetsFrom(withMotion)).toEqual(safeAreaInsetsFrom(without));
  expect(safeAreaInsetsFrom(withMotion)).toEqual(insets);
  expect(tappableBottomInsetFrom(withMotion)).toBe(tappableBottomInsetFrom(without));
  expect(tappableBottomInsetFrom(withMotion)).toBe(48);
});
