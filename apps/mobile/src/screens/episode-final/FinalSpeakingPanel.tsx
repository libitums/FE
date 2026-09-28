import { useMemo } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import audioWaves from "@libitums/icons/lynx/audio-waves";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import type { AnswerResult } from "../../lib/answer-result";
import { matchedWordCount, speakingWords } from "../../lib/speaking-judge";
import type { SafeAreaInsets } from "../../lib/safe-area";
import type { EpisodeFinalSpeakingQuestion } from "./episode-final.contract";
import { episodeFinalTestIds } from "./episode-final.contract";
import type { EpisodeFinalPhase } from "./episode-final";

export type FinalSpeakingPanelProps = {
  readonly insets: SafeAreaInsets;
  readonly question: EpisodeFinalSpeakingQuestion;
  readonly phase: EpisodeFinalPhase;
  readonly recognized: string;
  readonly result: AnswerResult | null;
  /**
   * 패널 위 주 버튼입니다 — `Speak` · `Stop` · `Skip`(인식 불가). 판정 뒤에는 없습니다 —
   * 잠시 뒤 저절로 다음 문항으로 갑니다. 버튼이 없어도 그 자리는 비워 둬 패널이 움직이지
   * 않습니다.
   */
  readonly action?: { readonly label: string; readonly run: () => void };
  /** `Can't speak`(지금은 말할 수 없음)입니다. 말하기 전에만 주 버튼 왼쪽에 좁게 섭니다. */
  readonly onNotNow?: () => void;
};

/**
 * 말하기 문항입니다(Figma 79-6484). 패널 위에 버튼이, 패널 안에 `Say` 표식 · 문장 · 발음
 * 표기 · 파형이 섭니다. 판정 뒤에는 `Say` 자리에 판정 배지가 서고, 앞에서부터 맞게 말한
 * 낱말이 주색 · 나머지가 흐린 회색으로 갈립니다 — 말하기 학습형과 같은 규칙입니다.
 *
 * 디자인의 `ⓘ`는 두지 않았습니다 — 무엇을 여는지 정해지지 않았습니다.
 */
export function FinalSpeakingPanel({
  insets,
  question,
  phase,
  recognized,
  result,
  action,
  onNotNow,
}: FinalSpeakingPanelProps): ReactNode {
  const words = useMemo(() => speakingWords(question.sentence), [question.sentence]);
  const judged = phase === "judged";
  const matched = judged ? matchedWordCount(question.sentence, recognized) : 0;

  return (
    <view className="episode-final-speaking" data-testid={episodeFinalTestIds.speaking}>
      <view className="episode-final-speaking-actions">
        {onNotNow === undefined ? null : (
          <view className="episode-final-not-now" data-testid={episodeFinalTestIds.notNow}>
            <Button
              label="Can't speak"
              variant="subtle"
              size="xl"
              width="fill"
              bindtap={onNotNow}
            />
          </view>
        )}
        {action === undefined ? null : (
          <view className="episode-final-speaking-action" data-testid={episodeFinalTestIds.action}>
            <Button
              label={action.label}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={action.run}
            />
          </view>
        )}
      </view>
      <view className="episode-final-speaking-panel">
        <view className="episode-final-speaking-badge-slot">
          {result === null ? (
            <view className="episode-final-say">
              <text className="episode-final-say-label">Say</text>
            </view>
          ) : (
            <AnswerVerdict result={result} />
          )}
        </view>
        {/* 낭독 이름은 문장 그대로입니다 — 색은 보이는 채널이고, 판정은 배지와 채점 발화가
            소리로 싣습니다. */}
        <text
          className={`episode-final-sentence episode-final-sentence-${judged ? "judged" : "plain"}`}
          data-testid={episodeFinalTestIds.sentence}
          data-matched={String(matched)}
          accessibility-label={question.sentence}
        >
          {words.map((word, index) => (
            <text
              key={index}
              className={
                judged && index < matched
                  ? "episode-final-word episode-final-word-matched"
                  : "episode-final-word"
              }
            >
              {index === 0 ? word : ` ${word}`}
            </text>
          ))}
        </text>
        <text className="episode-final-romanization" data-testid={episodeFinalTestIds.romanization}>
          {question.romanization}
        </text>
        {/* 파형 — 듣는 중에는 주색입니다. 듣는 중인지는 이 요소의 이름이 소리로 싣습니다. */}
        <view
          className="episode-final-waves"
          data-testid={episodeFinalTestIds.waves}
          data-listening={phase === "listening" ? "true" : "false"}
          accessibility-element={phase === "listening"}
          accessibility-label="듣는 중"
        >
          <svg
            className="episode-final-waves-icon"
            content={audioWaves}
            current-color={
              phase === "listening" ? color.brand.primary : color.brand["reward-disabled-surface"]
            }
          />
        </view>
        {/* 패널은 화면 바닥까지 닿습니다 — 홈 인디케이터 몫을 패널 안에서 비웁니다. */}
        <view style={{ height: `${insets.bottom}px` }} />
      </view>
    </view>
  );
}
