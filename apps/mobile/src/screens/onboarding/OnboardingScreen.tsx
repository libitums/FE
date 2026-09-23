import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import {
  nextOnboardingStep,
  onboardingActionLabel,
  onboardingCopy,
  onboardingSteps,
  previousOnboardingStep,
} from "./onboarding";
import { OnboardingQuizCards } from "./OnboardingQuizCards";
import { OnboardingStoryCards } from "./OnboardingStoryCards";
import { OnboardingUnitCard } from "./OnboardingUnitCard";
import type { OnboardingScreenProps, OnboardingStep } from "./onboarding.contract";

import "./onboarding-screen.css";

/**
 * 온보딩 스텝을 소유하고 머리·스크롤 골격·진행 점·제목/본문·다음 버튼을
 * 그립니다. `step`은 화면 로컬 상태입니다 — 전이 없이 이 컴포넌트 안에서만
 * 돕니다. 마지막 스텝에서 `nextOnboardingStep`이 `null`을 주면 `onComplete`를
 * 부릅니다.
 */
export function OnboardingScreen({ onComplete }: OnboardingScreenProps): ReactNode {
  const [step, setStep] = useState<OnboardingStep>(0);
  const copy = onboardingCopy(step);
  const actionLabel = onboardingActionLabel(step);
  const previous = previousOnboardingStep(step);

  function handleBack() {
    if (previous !== null) setStep(previous);
  }

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
      {/* 2026-09-21 디자인 반영: 좌상단 뒤로가기(RoundButton · neutral)입니다. 첫
          스텝에는 돌아갈 곳이 없어 버튼을 두지 않지만, 행 높이는 남겨 스텝 사이에
          레이아웃이 튀지 않게 합니다. */}
      <view className="onboarding-screen-header" data-testid="onboarding-screen-header">
        {previous === null ? null : (
          <RoundButton
            accessibilityLabel="Back"
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={handleBack}
          />
        )}
      </view>

      <scroll-view
        className="onboarding-screen-scroll"
        data-testid="onboarding-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="onboarding-screen-content">
          {/* 2026-09-21 디자인 반영: 스텝마다 400 높이 카드 영역이 갈립니다 — 첫 스텝은
              그림 카드와 대화 카드, 둘째는 겹쳐 쌓인 듣기 카드, 셋째는 학습 유닛 카드
              하나입니다. 카드가 스텝을 떠나며 언마운트되면 재생·칠하기·완료 표시
              상태도 함께 사라집니다 — 되돌아왔을 때 처음부터 다시 보이는 것은 이
              언마운트 때문입니다. */}
          {step === 2 ? (
            <OnboardingUnitCard />
          ) : step === 1 ? (
            <OnboardingQuizCards />
          ) : (
            <OnboardingStoryCards />
          )}

          {/* 페이지 표시 · 제목 · 본문 묶음입니다. 카드와의 간격(32)은 content의 gap이
              집니다. */}
          <view className="onboarding-screen-text">
            {/* 진행 래퍼가 보조기술 이름을 집니다. 안의 PageIndicator는 그림만
                맡습니다. */}
            <view
              className="onboarding-screen-progress"
              data-testid="onboarding-screen-progress"
              accessibility-element={true}
              accessibility-label={`Step ${step + 1} of ${onboardingSteps.length}`}
            >
              <PageIndicator pageCount={onboardingSteps.length} currentPage={step + 1} />
            </view>

            {/* 제목과 본문은 서로 붙어 읽히도록 따로 묶습니다(간격 4). */}
            <view className="onboarding-screen-heading">
              {/* 이 제목은 뒤따르는 본문의 이름을 지어 `header` trait을 받습니다. */}
              <text
                className="onboarding-screen-title"
                data-testid="onboarding-screen-title"
                accessibility-traits="header"
              >
                {copy.title}
                {copy.titleEmphasis ? (
                  <text className="onboarding-screen-title-emphasis">{` ${copy.titleEmphasis}`}</text>
                ) : null}
              </text>
              <text className="onboarding-screen-body" data-testid="onboarding-screen-body">
                {copy.body}
              </text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view className="onboarding-screen-next" data-testid="onboarding-screen-next">
        <Button
          label={actionLabel}
          variant="neutral"
          size="xl"
          width="hug"
          icon={arrowRight}
          iconPosition="trailing"
          bindtap={handleNext}
        />
      </view>
    </view>
  );
}
