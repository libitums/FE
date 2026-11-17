import { expect, test } from "vitest";

import { sheetBottomInsetFrom } from "./safe-area";

// SB1 ~ SB3: 바텀 시트가 패널 아래에 비울 높이. Android(호스트가 `tappableBottomInset`을 넘김)는 아래 시스템 바 전체 —
// 3버튼 48 · 제스처 핸들 24 — 를 비우고, iOS는 지금처럼 0(홈 인디케이터는 터치를 가로채지 않고 패널 기본 여백 20이 진다).

const threeButton = {
  safeAreaInsets: { top: 48, bottom: 48, left: 0, right: 0 },
  tappableBottomInset: 48,
};
const gesture = {
  safeAreaInsets: { top: 48, bottom: 24, left: 0, right: 0 },
  tappableBottomInset: 0,
};
const ios = { safeAreaInsets: { top: 62, bottom: 34, left: 0, right: 0 } };

test("SB1. Android 3버튼은 시스템 바 48을 비운다", () => {
  expect(sheetBottomInsetFrom(threeButton)).toBe(48);
});

test("SB2. Android 제스처는 핸들 24를 비운다(터치는 안 가로채도 가린다)", () => {
  expect(sheetBottomInsetFrom(gesture)).toBe(24);
});

test("SB3. iOS · 값 없음은 0이다", () => {
  expect(sheetBottomInsetFrom(ios)).toBe(0);
  expect(sheetBottomInsetFrom(undefined)).toBe(0);
  expect(sheetBottomInsetFrom({})).toBe(0);
  // 키가 어긋난 값이어도 Android로 보고 아래 값만 씁니다(던지지 않음).
  expect(sheetBottomInsetFrom({ safeAreaInsets: { bottom: 48 }, tappableBottomInset: "x" })).toBe(
    48,
  );
});
