import { expect, test } from "vitest";

import { safeAreaInsetsFrom, tappableBottomInsetFrom, zeroSafeAreaInsets } from "./safe-area";

const threeButton = {
  safeAreaInsets: { top: 48, bottom: 48, left: 0, right: 0 },
  tappableBottomInset: 48,
};
const iosInsets = { safeAreaInsets: { top: 62, bottom: 34, left: 0, right: 0 } };

test("SA1. 호스트가 넘긴 네 가장자리를 그대로 읽는다", () => {
  expect(
    safeAreaInsetsFrom({ safeAreaInsets: { top: 62, bottom: 34, left: 0, right: 0 } }),
  ).toEqual({ top: 62, bottom: 34, left: 0, right: 0 });
});

test("SA2. 값이 없으면(Explorer · 테스트 환경) 0이다", () => {
  expect(safeAreaInsetsFrom(undefined)).toEqual(zeroSafeAreaInsets);
  expect(safeAreaInsetsFrom({})).toEqual(zeroSafeAreaInsets);
  expect(safeAreaInsetsFrom({ safeAreaInsets: null })).toEqual(zeroSafeAreaInsets);
});

test("SA3. 숫자가 아니거나 음수·무한대인 가장자리는 0으로 둔다", () => {
  expect(
    safeAreaInsetsFrom({ safeAreaInsets: { top: "62", bottom: -1, left: Infinity, right: 8 } }),
  ).toEqual({ top: 0, bottom: 0, left: 0, right: 8 });
});

test("TB1. 3버튼 입력이면 터치를 가로채는 아래 높이를 그대로 읽는다", () => {
  expect(tappableBottomInsetFrom(threeButton)).toBe(48);
});

test("TB2. 키가 없으면(iOS · Explorer · 테스트 환경) 0이다", () => {
  expect(tappableBottomInsetFrom(iosInsets)).toBe(0);
  expect(tappableBottomInsetFrom(undefined)).toBe(0);
  expect(tappableBottomInsetFrom(null)).toBe(0);
  expect(tappableBottomInsetFrom({})).toBe(0);
  expect(tappableBottomInsetFrom("48")).toBe(0);
});

test("TB3. 숫자가 아니거나 음수·무한대·NaN인 값은 0이다", () => {
  for (const value of ["48", -1, Infinity, NaN, { bottom: 48 }, null]) {
    expect(tappableBottomInsetFrom({ tappableBottomInset: value })).toBe(0);
  }
});

test("TB4. 새 키가 함께 와도 safeAreaInsetsFrom의 네 값은 그대로다", () => {
  expect(safeAreaInsetsFrom(threeButton)).toEqual({ top: 48, bottom: 48, left: 0, right: 0 });
  expect(safeAreaInsetsFrom(iosInsets)).toEqual({ top: 62, bottom: 34, left: 0, right: 0 });
});
