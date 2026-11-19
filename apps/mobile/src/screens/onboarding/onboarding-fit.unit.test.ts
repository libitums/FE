import { expect, test } from "vitest";

import {
  onboardingStageHeight,
  onboardingStageMaxHeight,
  onboardingStageMinHeight,
} from "./onboarding";

// 2026-11-19 사용자 보고(iPhone 13 mini): 「Get started」 위 제목 · 본문이 잘린다. 카드 영역이 늘
// 400이라 위 여백 80 + 카드 400 + 간격 32 + 묶음이 스크롤 영역(549)을 넘었다. 카드 영역이 남는
// 세로만 받아야 묶음이 버튼 위에 다 보인다.
// 숫자는 iOS 시뮬레이터 캡처에서 읽은 높이(px ÷ 배율)와 토큰 합입니다 — 스크롤 영역 13 mini 549 ·
// SE(3세대) 467, 묶음(진행 점 · 간격 16 · 제목 한 줄 41 · 간격 4 · 본문 두 줄 32) 약 101. 고친 뒤 13 mini 캡처의
// 카드 영역이 335 안팎으로 OF1과 맞았습니다.

test("OF1. 13 mini — 카드 영역이 묶음 몫을 비우고 336으로 준다", () => {
  expect(onboardingStageHeight({ viewport: 549, text: 101 })).toBe(549 - 80 - 32 - 101);
});

test("OF2. SE(3세대) — 같은 식으로 254다", () => {
  expect(onboardingStageHeight({ viewport: 467, text: 101 })).toBe(254);
});

test("OF3. 화면이 넉넉하면 디자인 높이 400을 넘지 않는다", () => {
  expect(onboardingStageMaxHeight).toBe(400);
  expect(onboardingStageHeight({ viewport: 760, text: 101 })).toBe(400);
});

test("OF4. 글자가 아주 커 묶음이 크면 하한에서 멈추고 나머지는 스크롤이 받는다", () => {
  expect(onboardingStageHeight({ viewport: 467, text: 400 })).toBe(onboardingStageMinHeight);
  expect(onboardingStageMinHeight).toBeLessThan(254);
});

test("OF5. 아직 재지 못했으면 디자인 높이다", () => {
  expect(onboardingStageHeight({ viewport: undefined, text: 101 })).toBe(400);
  expect(onboardingStageHeight({ viewport: 549, text: undefined })).toBe(400);
});
