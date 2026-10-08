import { expect, test } from "vitest";

import { shellBottomLayout } from "./shell-bottom-layout";

test("SL1. 3버튼 · 탭 루트는 셸 아래 여백 48 · 바닥 면 48이다", () => {
  expect(shellBottomLayout({ showsNavigator: true, safeBottom: 48, tappableBottom: 48 })).toEqual({
    shellPaddingBottom: 48,
    navigatorFloorHeight: 48,
  });
});

test("SL2. 제스처 · 탭 루트는 여백도 바닥 면도 없다", () => {
  expect(shellBottomLayout({ showsNavigator: true, safeBottom: 24, tappableBottom: 0 })).toEqual({
    shellPaddingBottom: 0,
    navigatorFloorHeight: 0,
  });
});

test("SL3. iOS · 탭 루트는 여백도 바닥 면도 없다", () => {
  expect(shellBottomLayout({ showsNavigator: true, safeBottom: 34, tappableBottom: 0 })).toEqual({
    shellPaddingBottom: 0,
    navigatorFloorHeight: 0,
  });
});

test("SL4. 3버튼 · 쌓인 화면은 safe 값만큼 비우고 바닥 면을 덧대지 않는다", () => {
  expect(shellBottomLayout({ showsNavigator: false, safeBottom: 48, tappableBottom: 48 })).toEqual({
    shellPaddingBottom: 48,
    navigatorFloorHeight: 0,
  });
});

test("SL5. iOS 쌓인 화면은 34, 전체 화면 그림 화면은 0이다", () => {
  expect(shellBottomLayout({ showsNavigator: false, safeBottom: 34, tappableBottom: 0 })).toEqual({
    shellPaddingBottom: 34,
    navigatorFloorHeight: 0,
  });
  expect(shellBottomLayout({ showsNavigator: false, safeBottom: 0, tappableBottom: 48 })).toEqual({
    shellPaddingBottom: 0,
    navigatorFloorHeight: 0,
  });
});

test("SL6. tappableBottom이 0이면 수정 전 식과 모든 격자에서 같다", () => {
  for (const safeBottom of [0, 20, 24, 34, 48]) {
    for (const showsNavigator of [true, false]) {
      const before = showsNavigator ? 0 : safeBottom; // 수정 전 AppSession.tsx의 식
      expect(shellBottomLayout({ showsNavigator, safeBottom, tappableBottom: 0 })).toEqual({
        shellPaddingBottom: before,
        navigatorFloorHeight: 0,
      });
    }
  }
});
