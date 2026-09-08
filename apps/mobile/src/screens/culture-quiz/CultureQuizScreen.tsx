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

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사(ADR-0003 D6).
//
// LIB-244 (ui): 계약(.agent-harness/work/lib-244/spec.md §4.2 props · §4.3 골격 ·
// §4.4 `data-testid` · §4.6 접근성)의 속성 전부를 채운다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `cultureQuizSessionReducer`를 소비한다
// (계약 §3.3). 판정·완료·응답 여부를 상태에 적지 않는다 — 전부 파생이다.
//
// `onFinish`가 없다(D1) — 판정이 화면 밖으로 나가지 않는다. `results`도 없다.
//
// journey-map에서 가져오는 것은 타입 하나뿐이다(화면 간 import 규칙).
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

  // 완료는 파생이다 — 별도 done 필드를 두지 않는다. 완료 시점에는 questionIndex가
  // 문항 수와 같아 조회할 문항이 없다. 여기서 한 번만 갈라 아래에서 다시 묻지 않는다.
  const complete = isCultureQuizSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번 (ADR-0016 D11-2).
  // dep이 `complete` 하나다 — 리듀서가 `questionIndex`를 늘리기만 하므로 이 파생값은
  // false→true로 **한 번만** 갈린다. 그래서 재렌더로는 다시 돌지 않고, 마운트 때 이미
  // true면 그 순간이 「처음 존재하게 되는 순간」이라 거기서 한 번 돈다.
  // cleanup이 없다 — 낭독은 취소할 수 있는 자원이 아니다 (D11-2).
  //
  // 뒷절이 `맵으로`다 — 이 화면의 완료 상태에 남는 **유일한 조작 단위**가 머리의
  // 나가는 수단이고 `결과 보기`가 없다(LIB-244 D1). 판정(정답/오답)은 여전히
  // 발화하지 않는다 — 그것은 라벨 접미사(D3)가 진다.
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(cultureQuizCompletionAnnouncement(cultureQuizExitLabel));
  }, [complete]);

  return (
    <view className="culture-quiz-screen">
      {/* [고정] 머리 — `맵으로` + 제목. `맵으로`는 어느 시점에도 렌더된다(계약 §4.3
          ⚠) — 완료 상태를 포함해 대신할 나가는 수단이 없다(D1, 결과 보기가 없다). */}
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
          적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능하다. accessibility-*를 붙이지 않는다 — 조작 단위가 아니라 상자다
          (ADR-0022 D5). */}
      <scroll-view
        className="culture-quiz-screen-scroll"
        data-testid="culture-quiz-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐이다 — flex 어휘와 gap은 이 상자가 진다
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
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않는다.
            <text className="culture-quiz-screen-instruction">문항에 알맞은 답을 고르세요.</text>
          )}

          {question === null ? null : (
            <view className="culture-quiz-screen-options">
              {question.choices.map((choiceText, choiceIndex) => (
                <CultureQuizOption
                  key={choiceIndex}
                  index={choiceIndex}
                  text={choiceText}
                  // 판정을 지는 보기는 고른 하나뿐이다 — 고르지 않은 정답 보기는
                  // null이다.
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

      {/* [고정] 액션 행. 흐르는 영역이 아니라 화면의 직계 자식으로 남는다. 존재
          자체가 응답 여부의 프로브다 — 속성을 또 붙이지 않는다. 영구 disabled
          버튼을 두지 않는다(ADR-0016 D10). */}
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
