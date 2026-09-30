import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import type { AnswerResult } from "../../lib/answer-result";
import type { SafeAreaInsets } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import type { EpisodeFinalWordChoiceQuestion } from "./episode-final.contract";
import { episodeFinalTestIds } from "./episode-final.contract";
import {
  episodeFinalOptionState,
  episodeFinalPromptLabel,
  episodeFinalPromptLine,
} from "./episode-final";

export type FinalWordChoicePanelProps = {
  readonly insets: SafeAreaInsets;
  readonly question: EpisodeFinalWordChoiceQuestion;
  readonly chosenIndex: number | null;
  readonly result: AnswerResult | null;
  readonly onChoose: (optionIndex: number) => void;
};

/**
 * 낱말 고르기 문항입니다(Figma 79-6648). 보기 셋이 장면 위에 서고, 아래에 빈칸 문장이
 * **서사의 대화 패널과 같은 모양**(`VisualNovelDialog` — 말하는 사람 · 대사 · 번역)으로
 * 섭니다(2026-09-28 결정). 문항이 서사의 한 장면처럼 읽히게 하려는 것입니다.
 *
 * 고르면 판정 배지가 보기 위에 서고, 정답 보기가 초록으로 — 틀렸으면 고른 보기가 빨강으로 —
 * 바뀝니다. 빈칸은 정답으로 채워지고, 잠시 뒤 저절로 다음 문항으로 갑니다. 한 번 고르면
 * 다시 고를 수 없습니다.
 */
export function FinalWordChoicePanel({
  insets,
  question,
  chosenIndex,
  result,
  onChoose,
}: FinalWordChoicePanelProps): ReactNode {
  const copy = useUiCopy();
  const judged = chosenIndex !== null;

  return (
    <view className="episode-final-word-choice" data-testid={episodeFinalTestIds.wordChoice}>
      <view className="episode-final-choices">
        {result === null ? null : <AnswerVerdict result={result} />}
        <view className="episode-final-options">
          {question.options.map((option, index) => {
            const state = episodeFinalOptionState(question, chosenIndex, index);
            return (
              <view
                key={index}
                className={`episode-final-option episode-final-option-${state}`}
                data-testid={episodeFinalTestIds.option(index)}
                data-state={state}
                accessibility-element={true}
                accessibility-traits={judged ? "text" : "button"}
                accessibility-label={`${option}${question.romanizations ? `, ${question.romanizations[index]}` : ""}${copy.episodeFinal.optionSuffix[state]}`}
                bindtap={() => onChoose(index)}
              >
                <text className="episode-final-option-label" accessibility-element={false}>
                  {option}
                </text>
                {question.romanizations ? (
                  <text className="episode-final-option-romanization" accessibility-element={false}>
                    {question.romanizations[index]}
                  </text>
                ) : null}
              </view>
            );
          })}
        </view>
      </view>
      <view className="episode-final-dialog" data-testid={episodeFinalTestIds.prompt}>
        <VisualNovelDialog
          speakerName={question.speakerName}
          avatar={<Avatar name={question.speakerName} size="sm" accessibility="hidden" />}
          line={episodeFinalPromptLine(question, judged)}
          translation={question.translation}
          accessibilityLabel={`${question.speakerName}: ${episodeFinalPromptLabel(question, judged, copy)}, ${question.translation}`}
          surface="translucent"
          continueIndicator="off"
          contentLanguage="learning"
          languageTag="ko"
        />
        {/* 홈 인디케이터 몫입니다. 인라인 여백은 CSS 여백을 덮어써 상자로 둡니다. */}
        <view style={{ height: `${insets.bottom}px` }} />
      </view>
    </view>
  );
}
