import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import {
  nextOnboardingStep,
  onboardingActionLabel,
  onboardingCopy,
  onboardingSteps,
} from "./onboarding";
import type { OnboardingScreenProps, OnboardingStep } from "./onboarding.contract";

import "./onboarding-screen.css";

// LIB-261 (ui-implementation): 계약(.agent-harness/work/lib-261/spec.md §2.4 ·
// §4.2~§4.5)과 design.md §4의 값을 채운다.
//
// `step`은 화면 로컬 상태다(§2.4) — 전이 없이 이 컴포넌트 안에서만 돈다. 마지막
// 스텝에서 `nextOnboardingStep`이 `null`을 돌려주면 `onComplete`를 부른다.
//
// LIB-261 (ui-implementation r0.3, M-4 · §0.10 (3)): 진행 점 묶음 래퍼는 보조기술
// 채널을 가진 접근성 요소다 — 이름은 §8의 `${총}단계 중 ${현재}단계` 형태를
// 스텝 수(`onboardingSteps.length`)에서 뽑는다(리터럴로 고정하지 않는다).
// `accessibility-traits`는 붙이지 않는다(조작 단위가 아니다).
export function OnboardingScreen({ onComplete }: OnboardingScreenProps): ReactNode {
  const [step, setStep] = useState<OnboardingStep>(0);
  const copy = onboardingCopy(step);
  const actionLabel = onboardingActionLabel(step);

  function handleNext() {
    const next = nextOnboardingStep(step);
    if (next === null) {
      onComplete();
      return;
    }
    setStep(next);
  }

  return (
    <view className="onboarding-screen" data-testid="onboarding-screen" data-step={step}>
      <view
        className="onboarding-screen-progress"
        data-testid="onboarding-screen-progress"
        accessibility-element={true}
        accessibility-label={`${onboardingSteps.length}단계 중 ${step + 1}단계`}
      >
        {onboardingSteps.map((dotStep) => (
          <view
            key={dotStep}
            className={
              "onboarding-screen-progress-dot" +
              (dotStep === step ? " onboarding-screen-progress-dot-current" : "")
            }
            data-testid={`onboarding-screen-progress-dot-${dotStep}`}
            data-current={dotStep === step ? "true" : "false"}
          />
        ))}
      </view>

      <scroll-view
        className="onboarding-screen-scroll"
        data-testid="onboarding-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="onboarding-screen-content">
          {/* 이 제목은 머리 행이 아니라 흐름의 자식이지만, 뒤따르는 본문의 이름을
              지어 `header` trait을 받는다(§4.4 「화면 제목 다섯」의 하나 — A2가
              배제하는 것은 스플래시뿐이다). */}
          <text
            className="onboarding-screen-title"
            data-testid="onboarding-screen-title"
            accessibility-traits="header"
          >
            {copy.title}
          </text>
          <text className="onboarding-screen-body" data-testid="onboarding-screen-body">
            {copy.body}
          </text>
        </view>
      </scroll-view>

      <view
        className="onboarding-screen-next"
        data-testid="onboarding-screen-next"
        accessibility-element={true}
        accessibility-label={actionLabel}
        accessibility-traits="button"
        bindtap={handleNext}
      >
        <text className="onboarding-screen-next-label">{actionLabel}</text>
      </view>
    </view>
  );
}
