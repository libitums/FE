import { expect, test } from "vitest";

import { safeAreaInsetsFrom, zeroSafeAreaInsets } from "./safe-area";

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
