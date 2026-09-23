import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { CultureQuizOption } from "./CultureQuizOption";
import {
  choiceResultAt,
  cultureQuizCompletionAnnouncement,
  cultureQuizCompletionText,
  cultureQuizExitLabel,
  cultureQuizProgressLabel,
  cultureQuizQuestionsForStep,
  cultureQuizScreenTitle,
  cultureQuizSessionReducer,
  hasAnswered,
  initialCultureQuizSessionState,
  isCultureQuizSessionComplete,
} from "./culture-quiz";
import type { JourneyStepId } from "../journey-map/journey-map";

import "./culture-quiz-screen.css";

// 세션 상태는 이 화면이 소유하고 순수 함수 `cultureQuizSessionReducer`를
// 소비합니다. 판정·완료·응답 여부를 상태에 적지 않습니다 — 전부 파생입니다.
// `onFinish`가 없습니다 — 판정이 화면 밖으로 나가지 않습니다. `results`도
// 없습니다.
export type CultureQuizScreenProps = {
  stepId: JourneyStepId;
  stepOrdinal: number;
  onExit: () => void;
};

export function CultureQuizScreen({
  stepId,
  stepOrdinal,
  onExit,
}: CultureQuizScreenProps): ReactNode {
  const questions = cultureQuizQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(cultureQuizSessionReducer, initialCultureQuizSessionState);

  // 완료는 파생입니다 — 별도 done 필드를 두지 않습니다. 완료 시점에는
  // questionIndex가 문항 수와 같아 조회할 문항이 없습니다. 여기서 한 번만
  // 갈라 아래에서 다시 묻지 않습니다.
  const complete = isCultureQuizSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번입니다(ADR-0016 D11-2).
  // dep이 `complete` 하나입니다 — 리듀서가 `questionIndex`를 늘리기만 하므로
  // 이 파생값은 false→true로 **한 번만** 갈립니다. 그래서 재렌더로는 다시
  // 돌지 않고, 마운트 때 이미 true면 그 순간이 「처음 존재하게 되는 순간」이라
  // 거기서 한 번 돕니다. cleanup이 없습니다 — 낭독은 취소할 수 있는 자원이
  // 아닙니다(D11-2).
  //
  // 뒷절이 `맵으로`입니다 — 이 화면의 완료 상태에 남는 **유일한 조작 단위**가
  // 머리의 나가는 수단이고 `결과 보기`가 없습니다. 판정(정답/오답)은 여전히
  // 발화하지 않습니다 — 그것은 라벨 접미사가 집니다.
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(cultureQuizCompletionAnnouncement(cultureQuizExitLabel));
  }, [complete]);

  return (
    <view className="culture-quiz-screen">
      {/* [고정] 머리 — `맵으로` + 제목. `맵으로`는 어느 시점에도 렌더됩니다 ⚠
          — 완료 상태를 포함해 대신할 나가는 수단이 없습니다(결과 보기가
          없습니다). */}
      <view className="culture-quiz-screen-header">
        <view
          className="culture-quiz-screen-exit"
          data-testid="culture-quiz-screen-exit"
          accessibility-element={true}
          accessibility-label={cultureQuizExitLabel}
          accessibility-traits="button"
          bindtap={onExit}
        >
          <text className="culture-quiz-screen-exit-label">{cultureQuizExitLabel}</text>
        </view>
        <text
          className="culture-quiz-screen-title"
          data-testid="culture-quiz-screen-title"
          accessibility-traits="header"
        >
          {cultureQuizScreenTitle(stepOrdinal)}
        </text>
      </view>

      {/* [흐름] 내용 슬롯 — ADR-0022 D3. scroll-orientation·scroll-bar-enable을
          적습니다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이
          원리적으로 불가능합니다. accessibility-*를 붙이지 않습니다 — 조작
          단위가 아니라 상자입니다(ADR-0022 D5). */}
      <scroll-view
        className="culture-quiz-screen-scroll"
        data-testid="culture-quiz-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐입니다 — flex 어휘와 gap은 이 상자가 집니다
            (ADR-0022 D4). */}
        <view className="culture-quiz-screen-content">
          {question === null ? null : (
            <text
              className="culture-quiz-screen-progress"
              data-testid="culture-quiz-screen-progress"
            >
              {cultureQuizProgressLabel(state.questionIndex, questions.length)}
            </text>
          )}

          {question === null ? null : (
            <text className="culture-quiz-screen-prompt" data-testid="culture-quiz-screen-prompt">
              {question.prompt}
            </text>
          )}

          {question === null ? null : (
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않습니다.
            <text className="culture-quiz-screen-instruction">문항에 알맞은 답을 고르세요.</text>
          )}

          {question === null ? null : (
            <view className="culture-quiz-screen-options">
              {question.choices.map((choiceText, choiceIndex) => (
                <CultureQuizOption
                  key={choiceIndex}
                  index={choiceIndex}
                  text={choiceText}
                  // 판정을 지는 보기는 고른 하나뿐입니다 — 고르지 않은 정답
                  // 보기는 null입니다.
                  result={choiceResultAt(state, question, choiceIndex)}
                  onSelect={(index) => dispatch({ type: "selectChoice", choiceIndex: index })}
                />
              ))}
            </view>
          )}

          {question === null ? (
            <text
              className="culture-quiz-screen-complete"
              data-testid="culture-quiz-screen-complete"
            >
              {cultureQuizCompletionText}
            </text>
          ) : null}
        </view>
      </scroll-view>

      {/* [고정] 액션 행. 흐르는 영역이 아니라 화면의 직계 자식으로 남습니다.
          존재 자체가 응답 여부의 프로브입니다 — 속성을 또 붙이지 않습니다.
          영구 disabled 버튼을 두지 않습니다(ADR-0016 D10). */}
      {hasAnswered(state) ? (
        <view
          className="culture-quiz-screen-next"
          data-testid="culture-quiz-screen-next"
          accessibility-element={true}
          accessibility-label="다음"
          accessibility-traits="button"
          bindtap={() => dispatch({ type: "nextQuestion" })}
        >
          <text className="culture-quiz-screen-next-label">다음</text>
        </view>
      ) : null}
    </view>
  );
}
