import { expect, test } from "vitest";

import { sheetBottomInsetFrom } from "./safe-area";

// SB1 ~ SB4: 바텀 시트가 패널 아래에 비울 높이. Android(호스트가 `tappableBottomInset`을 넘김)는 아래 시스템 바 전체 —
// 3버튼 48 · 제스처 핸들 24 — 를 비운다. iOS는 홈 인디케이터 안전 영역(34)에서 패널 기본 여백을 뺀 만큼만 더 비워, 단추 아래
// 가장자리가 안전 영역 밖에 선다(ADR-0044 D3 개정 2026-11-18). 홈 인디케이터가 없는 기기(아래 0)는 그대로.

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

test("SB3. iOS는 안전 영역에서 패널 기본 여백을 뺀 만큼 비운다 · 값 없음은 0이다", () => {
  expect(sheetBottomInsetFrom(ios)).toBe(14);
  expect(sheetBottomInsetFrom(ios, 16)).toBe(18);
  expect(sheetBottomInsetFrom(undefined)).toBe(0);
  expect(sheetBottomInsetFrom({})).toBe(0);
  // 키가 어긋난 값이어도 Android로 보고 아래 값만 씁니다(던지지 않음).
  expect(sheetBottomInsetFrom({ safeAreaInsets: { bottom: 48 }, tappableBottomInset: "x" })).toBe(
    48,
  );
});

test("SB4. iOS 홈 인디케이터가 없거나 기본 여백이 더 크면 0 · Android는 기본 여백과 상관없다", () => {
  expect(sheetBottomInsetFrom({ safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 } })).toBe(
    0,
  );
  expect(sheetBottomInsetFrom(ios, 40)).toBe(0);
  expect(sheetBottomInsetFrom(threeButton, 16)).toBe(48);
  expect(sheetBottomInsetFrom(gesture, 16)).toBe(24);
});
