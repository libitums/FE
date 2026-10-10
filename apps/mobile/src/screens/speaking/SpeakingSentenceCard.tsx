import { useMemo } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import audioWaves from "@libitums/icons/lynx/audio-waves";
import { color } from "@libitums/design-tokens";

import { speakingWords } from "./speaking";
import type { SpeakingQuestion } from "./speaking";

import "./speaking-screen.css";

export type SpeakingSentenceCardProps = {
  question: SpeakingQuestion;
  judged: boolean;
  matched: number;
  listening: boolean;
  recordingLabel: string | undefined;
  onRecording: (() => void) | undefined;
};

// 말하기 카드 안의 문장 · 발음 · 번역 · 녹음 아이콘입니다. 상태는 SpeakingScreen이 소유합니다.
export function SpeakingSentenceCard({
  question,
  judged,
  matched,
  listening,
  recordingLabel,
  onRecording,
}: SpeakingSentenceCardProps): ReactNode {
  const words = useMemo(() => speakingWords(question.sentence), [question]);
  const recordable = onRecording !== undefined;

  return (
    <>
      {/* 판정 뒤에는 연속으로 맞힌 낱말을 칠합니다. */}
      <text
        className={`speaking-screen-sentence speaking-screen-sentence-${judged ? "judged" : "plain"}`}
        data-testid="speaking-screen-sentence"
        data-matched={String(matched)}
        accessibility-label={question.sentence}
      >
        {words.map((word, index) => (
          <text
            key={index}
            className={
              judged && index < matched
                ? "speaking-screen-word speaking-screen-word-matched"
                : "speaking-screen-word"
            }
          >
            {index === 0 ? word : ` ${word}`}
          </text>
        ))}
      </text>
      <text className="speaking-screen-romanization" data-testid="speaking-screen-romanization">
        {question.romanization}
      </text>
      {question.support ? (
        <text className="speaking-screen-translation" data-testid="speaking-screen-translation">
          {question.support.translation}
        </text>
      ) : null}

      {/* 녹음 아이콘과 하단 버튼이 같은 시작·중지 동작을 제공합니다. */}
      <view
        className="speaking-screen-waves"
        data-testid="speaking-screen-waves"
        data-listening={listening ? "true" : "false"}
        accessibility-element={recordable}
        accessibility-traits={recordable ? "button" : undefined}
        accessibility-label={recordingLabel}
        bindtap={onRecording}
      >
        <svg
          className="speaking-screen-waves-icon"
          content={audioWaves}
          current-color={listening ? color.brand.primary : color.gray[300]}
        />
      </view>
    </>
  );
}
