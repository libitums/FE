// 온보딩 순수 로직을 소유합니다. 화면은 이 결과를 그리기만 합니다.

import type {
  OnboardingStartedEvent,
  OnboardingStepNumber,
  OnboardingStepViewedEvent,
} from "../../lib/entry-flow";
import type {
  OnboardingCopy,
  OnboardingScreenCopy,
  OnboardingStep,
  OnboardingStepVia,
  OnboardingSwipePoint,
} from "./onboarding.contract";

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

// 스텝이 손대지 않은 채 이만큼 서 있으면 다음 스텝으로 넘어갑니다(ADR-0159). 손이 닿으면 다시 셉니다.
export const onboardingAutoAdvanceMs = 4000;

// 이보다 짧은 가로 움직임은 밀기가 아닙니다 — 알림 줄 밀기(`notifications.ts`)와 같은 값입니다.
const swipeDistance = 32;

/** 손가락이 start → current로 움직였을 때 갈 스텝입니다. 왼쪽 = 다음, 오른쪽 = 앞. 없으면 null. 순수. */
export function onboardingSwipeStep(
  step: OnboardingStep,
  start: OnboardingSwipePoint,
  current: OnboardingSwipePoint,
): OnboardingStep | null {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  if (Math.abs(dx) < swipeDistance || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? nextOnboardingStep(step) : previousOnboardingStep(step);
}

/**
 * 자동 넘김이 갈 스텝입니다 — 마지막에서 멈추고(돌지 않음), 동작 줄이기를 켠 사람에게는 넘기지
 * 않습니다(스스로 바뀌는 화면을 피함, ADR-0159). 순수.
 */
export function onboardingAutoAdvanceStep(
  step: OnboardingStep,
  reducedMotion: boolean,
): OnboardingStep | null {
  return reducedMotion ? null : nextOnboardingStep(step);
}

const stepNumber = (step: OnboardingStep): OnboardingStepNumber =>
  step === 0 ? "1" : step === 1 ? "2" : "3";

export function onboardingStepViewedEvent(
  step: OnboardingStep,
  via: OnboardingStepVia,
): OnboardingStepViewedEvent {
  return { name: "onboarding_step_viewed", step: stepNumber(step), via };
}

export function onboardingStartedEvent(
  step: OnboardingStep,
  autoAdvanced: boolean,
): OnboardingStartedEvent {
  return { name: "onboarding_started", step: stepNumber(step), autoAdvanced };
}
