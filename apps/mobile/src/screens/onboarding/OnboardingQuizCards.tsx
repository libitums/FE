import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import info from "@libitums/icons/lynx/info";
import play from "@libitums/icons/lynx/play";
import refresh from "@libitums/icons/lynx/refresh";
import stop from "@libitums/icons/lynx/stop";
import { AnswerLabel } from "@libitums/ui-lynx/answer-label";
import { Card } from "@libitums/ui-lynx/card";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import "./onboarding-quiz-cards.css";

// 표현과 한 글자를 칠하는 간격입니다. 칠하기는 띄어쓰기·문장부호까지 한 칸씩
// 셉니다.
const quizSyllables = Array.from("선크림 있어요?");
const quizSyllableMs = 350;

/**
 * 온보딩 둘째 스텝의 겹쳐 쌓인 카드 셋과 한 글자씩 칠하는 재생 시연을 그립니다.
 * 재생·칠하기 상태는 이 컴포넌트가 소유합니다 — 스텝을 떠나 언마운트되면 함께
 * 초기화됩니다.
 */
export function OnboardingQuizCards(): ReactNode {
  // 실제 소리는 내지 않습니다 — 온보딩의 시연용 모양입니다. 재생하면 표현이 한
  // 글자씩 brand.primary로 칠해지고(`filled`), 끝까지 칠하면 저절로 멈춥니다.
  // `run`은 다시 듣기가 재생 중에도 처음부터 다시 칠하게 하는 회차 표시입니다.
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

  function togglePlay() {
    setFilled(0);
    setPlaying((value) => !value);
  }

  function replay() {
    setFilled(0);
    setRun((value) => value + 1);
    setPlaying(true);
  }

  return (
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
                // 표현(display 타이포)입니다. 문구는 임시입니다.
                <view className="onboarding-screen-quiz">
                  {/* 위: 정답 배지는 가로 가운데, 정보 아이콘은 오른쪽 끝입니다. */}
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
                  {/* 카드 아래 끝: 다시 듣기(왼쪽) · 재생/정지(가운데, 더 크게)입니다.
                      오른쪽 빈 자리를 다시 듣기와 같은 크기로 둬 재생 버튼이 정확히
                      가운데에 섭니다. */}
                  <view className="onboarding-screen-quiz-controls">
                    <RoundButton
                      accessibilityLabel="Replay"
                      icon={refresh}
                      variant="brand"
                      size="l"
                      bindtap={replay}
                    />
                    <RoundButton
                      accessibilityLabel={playing ? "Stop" : "Play"}
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
  );
}
