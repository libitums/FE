// 온보딩 순수 로직을 소유합니다. 화면은 이 결과를 그리기만 합니다.

import type { OnboardingCopy, OnboardingScreenCopy, OnboardingStep } from "./onboarding.contract";

export const onboardingSteps: readonly OnboardingStep[] = [0, 1, 2];

// 문구는 문구표의 `onboarding` 구획이 집니다 — 화면이 UI 언어의 구획을 넘깁니다.
// 제목 · 본문은 자리표입니다 — `ui` 테스트가 리터럴을 단언하지 않습니다.
export function onboardingCopy(step: OnboardingStep, copy: OnboardingScreenCopy): OnboardingCopy {
  return copy.steps[step];
}

// 마지막 스텝에서 `null`을 돌려줍니다 — union에 빈 값이 없어 「다음이 없다」를
// `null`이 집니다.
export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  switch (step) {
    case 0: {
      return 1;
    }
    case 1: {
      return 2;
    }
    case 2: {
      return null;
    }
  }
}

// 첫 스텝에서 `null`을 돌려줍니다 — 스플래시로 돌아갈 곳이 없어 뒤로가기를 두지
// 않습니다.
export function previousOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  switch (step) {
    case 0: {
      return null;
    }
    case 1: {
      return 0;
    }
    case 2: {
      return 1;
    }
  }
}

// 마지막 스텝만 갈립니다 — 나머지는 저장소의 진행 어휘를 잇습니다.
export function onboardingActionLabel(step: OnboardingStep, copy: OnboardingScreenCopy): string {
  switch (step) {
    case 0:
    case 1: {
      return copy.next;
    }
    case 2: {
      return copy.getStarted;
    }
  }
}
