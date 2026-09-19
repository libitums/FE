import { expect, test } from "vitest";

import type { OnboardingStep } from "./onboarding.contract";
import {
  nextOnboardingStep,
  onboardingActionLabel,
  onboardingCopy,
  onboardingSteps,
} from "./onboarding";

// 계약: .agent-harness/work/lib-261/spec.md §2.4(순수 타입 계약) · §3(pureFunctions)
// 계획: .agent-harness/work/lib-261/test-plan.md unit § `screens/onboarding/onboarding.unit.test.ts`
// (신설). 케이스 id는 계획의 OB1~OB5 그대로다.
//
// 스텝 셋 [0,1,2]는 계약 리터럴이다 — `onboardingSteps`(source of truth, 지금은
// 스텁이라 빈 배열)를 순회하면 스텁 상태에서 루프가 0회 돌아 공허하게 통과한다.
// 그래서 OB3~OB5는 이 로컬 상수로 스텝 셋을 짓는다(`navigation.unit.test.ts`의
// `allLearningForms` 선례와 같은 이유).
const allOnboardingSteps: readonly OnboardingStep[] = [0, 1, 2];

// OB1
test("OB1. onboardingSteps가 0·1·2 셋이다", () => {
  expect(onboardingSteps).toEqual([0, 1, 2]);
});

// OB2
test("OB2. nextOnboardingStep이 0→1·1→2·2→null이다", () => {
  expect(nextOnboardingStep(0)).toBe(1);
  expect(nextOnboardingStep(1)).toBe(2);
  expect(nextOnboardingStep(2)).toBeNull();
});

// OB3
test("OB3. onboardingActionLabel이 0·1에서 같고 2에서 갈린다", () => {
  const stepZero = onboardingActionLabel(0);
  const stepOne = onboardingActionLabel(1);
  const stepTwo = onboardingActionLabel(2);

  expect(stepZero.trim().length).toBeGreaterThan(0);
  expect(stepTwo.trim().length).toBeGreaterThan(0);
  expect(stepOne).toBe(stepZero);
  expect(stepTwo).not.toBe(stepZero);
});

// OB4
test("OB4. 스텝 셋 각각에 공백 아닌 제목·본문이 있다", () => {
  for (const step of allOnboardingSteps) {
    const copy = onboardingCopy(step);

    expect(copy.title.trim().length).toBeGreaterThan(0);
    expect(copy.body.trim().length).toBeGreaterThan(0);
  }
});

// OB5
test("OB5. 스텝 셋의 제목이 서로 다르다", () => {
  const titles = allOnboardingSteps.map((step) => onboardingCopy(step).title);

  expect(new Set(titles).size).toBe(allOnboardingSteps.length);
});
