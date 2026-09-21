import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import info from "@libitums/icons/lynx/info";
import play from "@libitums/icons/lynx/play";
import refresh from "@libitums/icons/lynx/refresh";
import stop from "@libitums/icons/lynx/stop";
import { AnswerLabel } from "@libitums/ui-lynx/answer-label";
import { Button } from "@libitums/ui-lynx/button";
import { Card } from "@libitums/ui-lynx/card";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { StatusIndicator } from "@libitums/ui-lynx/status-indicator";

import {
  nextOnboardingStep,
  onboardingActionLabel,
  onboardingCopy,
  onboardingSteps,
  previousOnboardingStep,
} from "./onboarding";
import storyBackground from "./assets/story-background.png";
import storyCharacter from "./assets/story-character.png";
import type { OnboardingScreenProps, OnboardingStep } from "./onboarding.contract";

import "./onboarding-screen.css";

// 둘째 스텝 듣기 카드의 표현과 한 글자를 칠하는 간격. 칠하기는 띄어쓰기·문장부호까지
// 한 칸씩 센다.
const quizSyllables = Array.from("선크림 있어요?");
const quizSyllableMs = 350;

// 셋째 스텝의 학습 유닛이 「학습 중」에서 「완료」로 바뀌기까지의 시간.
const unitClearDelayMs = 1500;

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

  const previous = previousOnboardingStep(step);
  // 둘째 스텝 듣기 카드의 재생 표시. 실제 소리는 내지 않는다 — 온보딩의 시연용 모양이다.
  // 재생하면 표현이 한 글자씩 brand.primary로 칠해지고(`filled`), 끝까지 칠하면 저절로 멈춘다.
  // `run`은 다시 듣기가 재생 중에도 처음부터 다시 칠하게 하는 회차 표시다.
  const [playing, setPlaying] = useState(false);
  const [filled, setFilled] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setFilled((count) => Math.min(count + 1, quizSyllables.length));
    }, quizSyllableMs);
    return () => clearInterval(timer);
  }, [playing, run]);

  useEffect(() => {
    if (playing && filled >= quizSyllables.length) setPlaying(false);
  }, [playing, filled]);

  // 셋째 스텝: 들어오면 유닛이 학습 중으로 보이다가 잠시 뒤 완료로 바뀐다(시연용).
  const [unitCleared, setUnitCleared] = useState(false);
  useEffect(() => {
    setUnitCleared(false);
    if (step !== 2) return;
    const timer = setTimeout(() => setUnitCleared(true), unitClearDelayMs);
    return () => clearTimeout(timer);
  }, [step]);

  function togglePlay() {
    setFilled(0);
    setPlaying((value) => !value);
  }

  function replay() {
    setFilled(0);
    setRun((value) => value + 1);
    setPlaying(true);
  }

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
      {/* 2026-09-21 디자인 반영: 좌상단 뒤로가기(RoundButton · neutral). 첫 스텝에는 돌아갈
          곳이 없어 버튼을 두지 않지만, 행 높이는 남겨 스텝 사이에 레이아웃이 튀지 않게 한다. */}
      <view className="onboarding-screen-header" data-testid="onboarding-screen-header">
        {previous === null ? null : (
          <RoundButton
            accessibilityLabel="이전 단계"
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
          {/* 2026-09-21 디자인 반영: 스텝마다 400 높이 카드 영역이 갈린다 — 첫 스텝은 그림
              카드와 대화 카드, 둘째는 겹쳐 쌓인 듣기 카드, 셋째는 학습 유닛 카드 하나. */}
          {step === 2 ? (
            // 셋째 스텝: 400 높이 카드 하나에 학습 유닛 하나. 상태 배지가 Learning → Clear로 바뀐다.
            <view className="onboarding-screen-unit-area" data-testid="onboarding-screen-unit">
              <Card>
                <Card.Content>
                  <view className="onboarding-screen-unit">
                    <StatusIndicator
                      status={unitCleared ? "completed" : "in-progress"}
                      label={unitCleared ? "Clear" : "Learning"}
                    />
                    <text className="onboarding-screen-unit-title">Shopping at a beauty store</text>
                    <text className="onboarding-screen-unit-meta">Unit 1 · 5 min</text>
                  </view>
                </Card.Content>
              </Card>
            </view>
          ) : step === 1 ? (
            // 둘째 스텝: 카드 셋이 24씩 위로 어긋나며 겹쳐 쌓인다. 맨 앞 카드가 가장 위
            // (z-index)이고, 뒤 카드는 앞 카드 위쪽으로 24만큼씩만 보인다. 안의 내용은 아직 정해지지
            // 않은 자리다.
            <view className="onboarding-screen-stack" data-testid="onboarding-screen-stack">
              {(["back", "middle", "front"] as const).map((layer) => (
                <view
                  key={layer}
                  className={`onboarding-screen-stack-card onboarding-screen-stack-card-${layer}`}
                >
                  <Card>
                    <Card.Content>
                      {layer === "front" ? (
                        // 맨 앞 카드: 위에 정답 배지와 정보 아이콘, 가운데에 듣기 문항 형태의
                        // 표현(display 타이포). 문구는 임시다.
                        <view className="onboarding-screen-quiz">
                          {/* 위: 정답 배지는 가로 가운데, 정보 아이콘은 오른쪽 끝. */}
                          <view className="onboarding-screen-quiz-top">
                            <AnswerLabel result="correct" size="s" label="Correct" />
                            <svg
                              className="onboarding-screen-quiz-info"
                              content={info}
                              current-color={color.gray["600"]}
                            />
                          </view>
                          <view className="onboarding-screen-quiz-prompt">
                            <view className="onboarding-screen-quiz-word">
                              <text
                                className="onboarding-screen-quiz-text"
                                data-testid="onboarding-screen-quiz-text"
                                data-filled={filled}
                              >
                                {quizSyllables.map((syllable, index) => (
                                  <text
                                    key={index}
                                    className={
                                      index < filled
                                        ? "onboarding-screen-quiz-syllable onboarding-screen-quiz-syllable-filled"
                                        : "onboarding-screen-quiz-syllable"
                                    }
                                  >
                                    {syllable}
                                  </text>
                                ))}
                              </text>
                              <text className="onboarding-screen-quiz-romanization">
                                [seonkeurim isseoyo?]
                              </text>
                            </view>
                          </view>
                          {/* 카드 아래 끝: 다시 듣기(왼쪽) · 재생/정지(가운데, 더 크게). 오른쪽
                              빈 자리를 다시 듣기와 같은 크기로 둬 재생 버튼이 정확히 가운데에 선다. */}
                          <view className="onboarding-screen-quiz-controls">
                            <RoundButton
                              accessibilityLabel="다시 듣기"
                              icon={refresh}
                              variant="brand"
                              size="l"
                              bindtap={replay}
                            />
                            <RoundButton
                              accessibilityLabel={playing ? "정지" : "재생"}
                              icon={playing ? stop : play}
                              variant="brand"
                              size="xl"
                              bindtap={togglePlay}
                            />
                            <view className="onboarding-screen-quiz-controls-spacer" />
                          </view>
                        </view>
                      ) : (
                        <view />
                      )}
                    </Card.Content>
                  </Card>
                </view>
              ))}
            </view>
          ) : (
            <view className="onboarding-screen-cards" data-testid="onboarding-screen-cards">
              {step === 0 ? (
                // 첫 스텝의 첫 카드: 배경 그림이 카드를 채우고, 인물이 카드보다 커서 위로
                // 튀어나온다. 인물은 카드(Media가 모서리로 자른다) 밖 형제로 둬야 잘리지 않는다.
                // 그림 카드는 순수 장식이다. `<image>`는 기본 접근성 정지라(ADR-0016 D5) 인물
                // 그림이 이름 없는 정지로 남지 않게 래퍼가 자손을 통째로 가린다.
                <view
                  className="onboarding-screen-card-slot onboarding-screen-hero"
                  data-testid="onboarding-screen-hero"
                  accessibility-elements-hidden={true}
                >
                  <Card>
                    <Card.Media>
                      <image
                        className="onboarding-screen-hero-background"
                        src={storyBackground}
                        mode="aspectFill"
                      />
                    </Card.Media>
                  </Card>
                  <image
                    className="onboarding-screen-hero-character"
                    src={storyCharacter}
                    mode="aspectFit"
                  />
                </view>
              ) : (
                <view className="onboarding-screen-card-slot">
                  <Card>
                    <Card.Content>
                      <view />
                    </Card.Content>
                  </Card>
                </view>
              )}
              {step === 0 ? (
                // 첫 스텝의 둘째 카드: 상대 → 나 → 상대 순의 대화 버블 셋. 문구는 임시다.
                <view
                  className="onboarding-screen-card-slot onboarding-screen-chat"
                  data-testid="onboarding-screen-chat"
                >
                  <Card>
                    <Card.Content>
                      <view className="onboarding-screen-chat-list">
                        <ChatBubble
                          direction="incoming"
                          speaker="직원"
                          message="어서 오세요! 찾으시는 거 있으세요?"
                          translation="Welcome! Are you looking for anything?"
                          size="s"
                          contentLanguage="learning"
                          languageTag="ko"
                        />
                        <ChatBubble
                          direction="outgoing"
                          speaker="나"
                          message="선크림 있어요?"
                          translation="Do you have sunscreen?"
                          size="s"
                          contentLanguage="learning"
                          languageTag="ko"
                        />
                        <ChatBubble
                          direction="incoming"
                          speaker="직원"
                          message="네, 이쪽으로 오세요."
                          translation="Yes, come this way."
                          size="s"
                          contentLanguage="learning"
                          languageTag="ko"
                        />
                      </view>
                    </Card.Content>
                  </Card>
                </view>
              ) : (
                <view className="onboarding-screen-card-slot">
                  <Card>
                    <Card.Content>
                      <view />
                    </Card.Content>
                  </Card>
                </view>
              )}
            </view>
          )}

          {/* 페이지 표시 · 제목 · 본문 묶음. 카드와의 간격(32)은 content의 gap이 진다. */}
          <view className="onboarding-screen-text">
            {/* 진행 래퍼가 보조기술 이름을 진다(M-4). 안의 PageIndicator는 그림만 맡는다. */}
            <view
              className="onboarding-screen-progress"
              data-testid="onboarding-screen-progress"
              accessibility-element={true}
              accessibility-label={`${onboardingSteps.length}단계 중 ${step + 1}단계`}
            >
              <PageIndicator pageCount={onboardingSteps.length} currentPage={step + 1} />
            </view>

            {/* 제목과 본문은 서로 붙어 읽히도록 따로 묶는다(간격 4). */}
            <view className="onboarding-screen-heading">
              {/* 이 제목은 뒤따르는 본문의 이름을 지어 `header` trait을 받는다(§4.4). */}
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
