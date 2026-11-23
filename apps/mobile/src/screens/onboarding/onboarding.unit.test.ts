import { expect, test } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import type { OnboardingStep } from "./onboarding.contract";
import {
  nextOnboardingStep,
  onboardingAutoAdvanceMs,
  onboardingAutoAdvanceStep,
  onboardingStartedEvent,
  onboardingStepViewedEvent,
  onboardingSwipeStep,
  previousOnboardingStep,
  onboardingCopy,
  onboardingSteps,
} from "./onboarding";

// 스텝 셋 [0,1,2]는 리터럴로 고정합니다 — `onboardingSteps`(source of truth, 지금은
// 스텁이라 빈 배열)를 순회하면 스텁 상태에서 루프가 0회 돌아 공허하게 통과합니다.
// 그래서 OB3~OB5는 이 로컬 상수로 스텝 셋을 짓습니다(`navigation.unit.test.ts`의
// `allLearningForms` 선례와 같은 이유입니다).
const allOnboardingSteps: readonly OnboardingStep[] = [0, 1, 2];

test("OB1. onboardingSteps가 0·1·2 셋이다", () => {
  expect(onboardingSteps).toEqual([0, 1, 2]);
});

test("OB2. nextOnboardingStep이 0→1·1→2·2→null이다", () => {
  expect(nextOnboardingStep(0)).toBe(1);
  expect(nextOnboardingStep(1)).toBe(2);
  expect(nextOnboardingStep(2)).toBeNull();
});

test("OB3. 모든 스텝의 버튼 문구는 Get started 하나다(다음 버튼 없음)", () => {
  expect(uiCopyEn.onboarding.getStarted.trim().length).toBeGreaterThan(0);
  expect("next" in uiCopyEn.onboarding).toBe(false);
});

test("OB4. 스텝 셋 각각에 공백 아닌 제목·본문이 있다", () => {
  for (const step of allOnboardingSteps) {
    const copy = onboardingCopy(step, uiCopyEn.onboarding);

    expect(copy.title.trim().length).toBeGreaterThan(0);
    expect(copy.body.trim().length).toBeGreaterThan(0);
  }
});

test("OB5. 스텝 셋의 제목이 서로 다르다", () => {
  const titles = allOnboardingSteps.map((step) => onboardingCopy(step, uiCopyEn.onboarding).title);

  expect(new Set(titles).size).toBe(allOnboardingSteps.length);
});

test("OB5. previousOnboardingStep이 0에서 null, 1·2에서 한 칸 앞이다", () => {
  expect(previousOnboardingStep(0)).toBeNull();
  expect(previousOnboardingStep(1)).toBe(0);
  expect(previousOnboardingStep(2)).toBe(1);
});

test("OB6. 왼쪽으로 민 손가락은 다음 스텝, 오른쪽은 앞 스텝 — 끝에서는 null", () => {
  const start = { x: 300, y: 200 };
  expect(onboardingSwipeStep(0, start, { x: 240, y: 206 })).toBe(1);
  expect(onboardingSwipeStep(1, start, { x: 240, y: 206 })).toBe(2);
  expect(onboardingSwipeStep(2, start, { x: 240, y: 206 })).toBeNull();
  expect(onboardingSwipeStep(1, start, { x: 360, y: 196 })).toBe(0);
  expect(onboardingSwipeStep(0, start, { x: 360, y: 196 })).toBeNull();
});

test("OB7. 짧거나 세로가 더 긴 움직임은 스텝을 넘기지 않는다", () => {
  const start = { x: 300, y: 200 };
  expect(onboardingSwipeStep(0, start, { x: 290, y: 200 })).toBeNull();
  expect(onboardingSwipeStep(0, start, { x: 240, y: 290 })).toBeNull();
});

test("OB8. 자동 넘김은 마지막 스텝에서 멈추고, 동작 줄이기면 하지 않는다", () => {
  expect(onboardingAutoAdvanceMs).toBeGreaterThanOrEqual(3000);
  expect(onboardingAutoAdvanceStep(0, false)).toBe(1);
  expect(onboardingAutoAdvanceStep(1, false)).toBe(2);
  expect(onboardingAutoAdvanceStep(2, false)).toBeNull();
  expect(onboardingAutoAdvanceStep(0, true)).toBeNull();
});

test("OB9. 이벤트는 스텝을 1부터 문자열로, 시작에는 자동 넘김 여부를 싣는다", () => {
  expect(onboardingStepViewedEvent(0, "start")).toEqual({
    name: "onboarding_step_viewed",
    step: "1",
    via: "start",
  });
  expect(onboardingStepViewedEvent(2, "auto")).toEqual({
    name: "onboarding_step_viewed",
    step: "3",
    via: "auto",
  });
  expect(onboardingStartedEvent(1, true)).toEqual({
    name: "onboarding_started",
    step: "2",
    autoAdvanced: true,
  });
});
