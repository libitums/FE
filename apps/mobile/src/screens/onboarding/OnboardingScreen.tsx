import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { TouchEvent } from "@lynx-js/types";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";

import {
  onboardingAutoAdvanceMs,
  onboardingAutoAdvanceStep,
  onboardingCopy,
  onboardingStartedEvent,
  onboardingStepViewedEvent,
  onboardingSteps,
  onboardingSwipeStep,
  previousOnboardingStep,
} from "./onboarding";
import { OnboardingQuizCards } from "./OnboardingQuizCards";
import { OnboardingStoryCards } from "./OnboardingStoryCards";
import { OnboardingUnitCard } from "./OnboardingUnitCard";
import type {
  OnboardingScreenProps,
  OnboardingStep,
  OnboardingStepVia,
  OnboardingSwipePoint,
} from "./onboarding.contract";

import "./onboarding-screen.css";

// 타입은 `touches`를 반드시 준다고 적지만 런타임에는 빠질 수 있습니다(알림 줄 밀기와 같은 가드).
function touchPoint(event: TouchEvent): OnboardingSwipePoint | undefined {
  const touch = event.touches?.[0];
  return touch === undefined ? undefined : { x: touch.pageX, y: touch.pageY };
}

/**
 * 온보딩 스텝을 소유하고 머리·스크롤 골격·진행 점·제목/본문·시작 버튼을 그립니다(ADR-0159).
 * 스텝은 카드 영역을 밀거나, 손대지 않고 `onboardingAutoAdvanceMs`가 지나면 넘어갑니다(마지막에서
 * 멈춤). 아래 「Get started」는 어느 스텝에서든 곧바로 `onComplete`(로그인)입니다.
 */
export function OnboardingScreen({ onComplete, onEvent }: OnboardingScreenProps): ReactNode {
  const [step, setStep] = useState<OnboardingStep>(0);
  // 손이 닿을 때마다 올려 자동 넘김 시계를 처음부터 다시 셉니다.
  const [touchCount, setTouchCount] = useState(0);
  const uiCopy = useUiCopy();
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const copy = onboardingCopy(step, uiCopy.onboarding);
  const previous = previousOnboardingStep(step);
  const viewed = useRef(new Set<OnboardingStep>());
  const autoAdvanced = useRef(false);
  const swipeStart = useRef<OnboardingSwipePoint | undefined>(undefined);
  const swiped = useRef(false);

  // 다음에 보일 스텝이 어떤 길로 왔는지입니다 — 열람 이벤트가 읽습니다.
  const arrivedVia = useRef<OnboardingStepVia>("start");

  function show(target: OnboardingStep, via: OnboardingStepVia) {
    // oxlint-disable-next-line react/immutability
    arrivedVia.current = via;
    setStep(target);
  }

  // 스텝은 그 방문에서 처음 보일 때 한 번만 열람으로 셉니다(첫 렌더의 0도 여기서 셉니다).
  useEffect(() => {
    if (viewed.current.has(step)) return;
    viewed.current.add(step);
    onEvent?.(onboardingStepViewedEvent(step, arrivedVia.current));
  }, [step, onEvent]);

  // 손대지 않은 채 서 있으면 다음 스텝으로 갑니다. 스텝이 바뀌거나 손이 닿으면 다시 셉니다.
  useEffect(() => {
    const target = onboardingAutoAdvanceStep(step, reducedMotion);
    if (target === null) return undefined;
    const timer = setTimeout(() => {
      autoAdvanced.current = true;
      arrivedVia.current = "auto";
      setStep(target);
    }, onboardingAutoAdvanceMs);
    return () => clearTimeout(timer);
  }, [step, touchCount, reducedMotion]);

  function handleBack() {
    if (previous !== null) {
      playSound("button");
      show(previous, "back");
    }
  }

  // 시스템 뒤로가기 = 보이는 뒤로 버튼과 같은 함수입니다(첫 스텝에는 버튼이 없어 등록하지 않습니다).
  useScreenBack(previous === null ? null : handleBack);

  const handleTouchStart = (event: TouchEvent) => {
    "background only";
    // oxlint-disable-next-line react/immutability
    swipeStart.current = touchPoint(event);
    // oxlint-disable-next-line react/immutability
    swiped.current = false;
    setTouchCount((count) => count + 1);
  };

  const handleTouchMove = (event: TouchEvent) => {
    "background only";
    const current = touchPoint(event);
    if (swipeStart.current === undefined || current === undefined || swiped.current) return;
    const target = onboardingSwipeStep(step, swipeStart.current, current);
    if (target === null) return;
    // 한 번 민 손가락은 떼기 전까지 더 넘기지 않습니다.
    // oxlint-disable-next-line react/immutability
    swiped.current = true;
    show(target, target < step ? "back" : "swipe");
  };

  function handleStart() {
    playSound("button");
    onEvent?.(onboardingStartedEvent(step, autoAdvanced.current));
    onComplete();
  }

  return (
    <view className="onboarding-screen" data-testid="onboarding-screen" data-step={step}>
      {/* 2026-09-21 디자인 반영: 좌상단 뒤로가기(RoundButton · neutral)입니다. 첫
          스텝에는 돌아갈 곳이 없어 버튼을 두지 않지만, 행 높이는 남겨 스텝 사이에
          레이아웃이 튀지 않게 합니다. */}
      <view className="onboarding-screen-header" data-testid="onboarding-screen-header">
        {previous === null ? null : (
          <RoundButton
            accessibilityLabel={uiCopy.common.back}
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
        scroll-bar-enable={false}
      >
        <view
          className="onboarding-screen-content"
          data-testid="onboarding-screen-pager"
          bindtouchstart={handleTouchStart}
          bindtouchmove={handleTouchMove}
        >
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
              flatten={false}
              accessibility-element={true}
              accessibility-label={uiCopy.onboarding.progress(step + 1, onboardingSteps.length)}
            >
              <PageIndicator pageCount={onboardingSteps.length} currentPage={step + 1} decorative />
            </view>

            {/* 제목과 본문은 서로 붙어 읽히도록 따로 묶습니다(간격 4). */}
            <view className="onboarding-screen-heading">
              {/* 이 제목은 뒤따르는 본문의 이름을 지어 `header` trait을 받습니다. */}
              <text
                className="onboarding-screen-title"
                data-testid="onboarding-screen-title"
                flatten={false}
                accessibility-element={true}
                accessibility-heading={true}
                accessibility-traits="header"
              >
                {copy.title}
                {copy.titleEmphasis ? (
                  <text className="onboarding-screen-title-emphasis">{` ${copy.titleEmphasis}`}</text>
                ) : null}
              </text>
              <text
                className="onboarding-screen-body"
                data-testid="onboarding-screen-body"
                flatten={false}
                accessibility-element={true}
              >
                {copy.body}
              </text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view className="onboarding-screen-start" data-testid="onboarding-screen-start">
        <Button
          label={uiCopy.onboarding.getStarted}
          variant="neutral"
          size="xl"
          width="hug"
          icon={arrowRight}
          iconPosition="trailing"
          bindtap={handleStart}
        />
      </view>
    </view>
  );
}
