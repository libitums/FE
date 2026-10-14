import { expect, test } from "vitest";

import type { OnboardingStep } from "./onboarding.contract";
import {
  nextOnboardingStep,
  onboardingActionLabel,
  previousOnboardingStep,
  onboardingCopy,
  onboardingSteps,
} from "./onboarding";

// 스텝 넷 [0,1,2,3]은 리터럴로 고정합니다 — `onboardingSteps`(source of truth, 지금은
// 스텁이라 빈 배열)를 순회하면 스텁 상태에서 루프가 0회 돌아 공허하게 통과합니다.
// 그래서 OB3~OB5는 이 로컬 상수로 스텝 셋을 짓습니다(`navigation.unit.test.ts`의
// `allLearningForms` 선례와 같은 이유입니다).
const allOnboardingSteps: readonly OnboardingStep[] = [0, 1, 2, 3];

test("OB1. onboardingSteps가 0·1·2·3 넷이다", () => {
  expect(onboardingSteps).toEqual([0, 1, 2, 3]);
});

test("OB2. nextOnboardingStep이 0→1·1→2·2→3·3→null이다", () => {
  expect(nextOnboardingStep(0)).toBe(1);
  expect(nextOnboardingStep(1)).toBe(2);
  expect(nextOnboardingStep(2)).toBe(3);
  expect(nextOnboardingStep(3)).toBeNull();
});

test("OB3. onboardingActionLabel이 0·1·2에서 같고 3에서 갈린다", () => {
  const stepZero = onboardingActionLabel(0);
  const stepThree = onboardingActionLabel(3);

  expect(stepZero.trim().length).toBeGreaterThan(0);
  expect(stepThree.trim().length).toBeGreaterThan(0);
  expect(onboardingActionLabel(1)).toBe(stepZero);
  expect(onboardingActionLabel(2)).toBe(stepZero);
  expect(stepThree).not.toBe(stepZero);
});

test("OB4. 스텝 넷 각각에 공백 아닌 제목·본문이 있다", () => {
  for (const step of allOnboardingSteps) {
    const copy = onboardingCopy(step);

    expect(copy.title.trim().length).toBeGreaterThan(0);
    expect(copy.body.trim().length).toBeGreaterThan(0);
  }
});

test("OB5. 스텝 넷의 제목이 서로 다르다", () => {
  const titles = allOnboardingSteps.map((step) => onboardingCopy(step).title);

  expect(new Set(titles).size).toBe(allOnboardingSteps.length);
});

test("OB5. previousOnboardingStep이 0에서 null, 1·2·3에서 한 칸 앞이다", () => {
  expect(previousOnboardingStep(0)).toBeNull();
  expect(previousOnboardingStep(1)).toBe(0);
  expect(previousOnboardingStep(2)).toBe(1);
  expect(previousOnboardingStep(3)).toBe(2);
});
