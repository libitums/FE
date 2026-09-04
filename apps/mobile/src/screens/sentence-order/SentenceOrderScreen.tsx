import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { announce } from "../../lib/accessibility";
import { answerResultLabel } from "../../lib/answer-result";
import type { AnswerResult } from "../../lib/answer-result";
import { SentenceOrderChip } from "./SentenceOrderChip";
import {
  bankChipIndexes,
  canCheckArrangement,
  initialSentenceOrderSessionState,
  isSentenceOrderSessionComplete,
  sentenceOrderAnnouncement,
  sentenceOrderProgressLabel,
  sentenceOrderQuestionsForStep,
  sentenceOrderResultAt,
  sentenceOrderScreenTitle,
  sentenceOrderSessionReducer,
  sentenceOrderSessionResults,
} from "./sentence-order";
import type { JourneyStepId } from "../journey-map/journey-map";

import "./sentence-order-screen.css";

// LIB-229 W6 (ui): 계약(.agent-harness/work/lib-229/spec.md §1.8(b)·(c))의 속성 전부를
// 채운다. 골격·스크롤 컨테이너는 §1.9의 값이고, 낭독 순서는 §1.10, 능동 낭독은
// §1.11이다. 세션 상태는 이 화면이 소유하고 순수 함수 `sentenceOrderSessionReducer`를
// 소비한다(§1.5·§1.7) — 판정·완료·창고/답 줄 배치는 전부 파생이다.

export type SentenceOrderScreenProps = {
  stepId: JourneyStepId;
  stepOrdinal: number;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
};

// design.md §4.6(가) — 판정별 표식 아이콘. `ListeningChoice` · `AssessmentItem`과 같은
// 판단이다(모양이 색과 독립인 채널, WCAG 1.4.1). 전체 index를 import하지 않는다.
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// design.md §4.6 — `-text` 변형. 색은 CSS가 아니라 `current-color` 속성으로 넘긴다
// (ADR-0014 D2).
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

export function SentenceOrderScreen({
  stepId,
  stepOrdinal,
  onExit,
  onFinish,
}: SentenceOrderScreenProps): ReactNode {
  const questions = sentenceOrderQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(
    sentenceOrderSessionReducer,
    initialSentenceOrderSessionState,
  );

  // 완료는 파생이다(§1.7(b)의 `isSentenceOrderSessionComplete`) — 완료 시점에는
  // `questionIndex`가 문항 수와 같아 조회할 문항이 없다. 한 번만 갈라 아래에서 다시
  // 묻지 않는다(듣기와 같은 규율).
  const question = isSentenceOrderSessionComplete(state, questions.length)
    ? null
    : questions[state.questionIndex];

  const result = question === null ? null : sentenceOrderResultAt(question, state);

  // 채점 시점에 한 번만 낭독한다(계약 §1.11(c)). dep이 `[questionIndex, phase]`이고
  // `phase === "checked"`일 때만 민다 — 재렌더로 두 번 밀지 않는다. cleanup이 없다,
  // 낭독은 취소할 자원이 아니다(§1.11(c)).
  useEffect(() => {
    if (question === null || result === null) {
      return;
    }
    announce(sentenceOrderAnnouncement(result));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dep은 계약이 고정한 둘뿐이다
  }, [state.questionIndex, state.phase]);

  return (
    <view className="sentence-order-screen">
      {/* [고정] 머리 — 나가는 수단이 어느 시점에도 정확히 하나다. 완료 전에는
          `맵으로`뿐이고, 완료 뒤에는 `결과 보기`가 유일한 출구다(듣기 헤더 형태,
          §1.9(a)). */}
      <view className="sentence-order-screen-header">
        {question === null ? null : (
          <view
            className="sentence-order-screen-exit"
            data-testid="sentence-order-screen-exit"
            accessibility-element={true}
            accessibility-label="맵으로"
            accessibility-traits="button"
            bindtap={onExit}
          >
            <text className="sentence-order-screen-exit-label">맵으로</text>
          </view>
        )}
        <text
          className="sentence-order-screen-title"
          data-testid="sentence-order-screen-title"
          accessibility-traits="header"
        >
          {sentenceOrderScreenTitle(stepOrdinal)}
        </text>
      </view>

      {/* [흐름] 내용 슬롯 — FE ADR-0022. `scroll-orientation`·`scroll-bar-enable`을
          적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능하다(계약 §1.9(d)). accessibility-*를 붙이지 않는다 — 조작 단위가
          아니라 상자다(계약 §1.9(g)). */}
      <scroll-view
        className="sentence-order-screen-scroll"
        data-testid="sentence-order-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 하나다 — flex 어휘는 이 상자가 진다(계약 §1.9(e)). */}
        <view className="sentence-order-screen-content">
          {question === null ? null : (
            <text
              className="sentence-order-screen-progress"
              data-testid="sentence-order-screen-progress"
            >
              {sentenceOrderProgressLabel(state.questionIndex, questions.length)}
            </text>
          )}

          {question === null ? null : (
            <text
              className="sentence-order-screen-prompt"
              data-testid="sentence-order-screen-prompt"
            >
              {question.prompt}
            </text>
          )}

          {question === null ? null : (
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않는다.
            <text className="sentence-order-screen-instruction">
              조각을 눌러 순서대로 배치하세요.
            </text>
          )}

          {/* 답 줄 — DOM 순서가 창고보다 앞이다(계약 §1.10(d) — "무엇을 만들고
              있는가"가 "무엇으로 만드는가"보다 먼저). 놓임/안 놓임은 상태 클래스가
              아니라 어느 목록에 있는가로 난다(계약 §1.12). */}
          {question === null ? null : (
            <view
              className="sentence-order-screen-sentence"
              data-testid="sentence-order-screen-sentence"
            >
              {state.placedChipIndexes.map((chipIndex, position) => (
                <SentenceOrderChip
                  key={chipIndex}
                  index={chipIndex}
                  text={question.chips[chipIndex] ?? ""}
                  placedOrdinal={position + 1}
                  onTap={(index) => dispatch({ type: "toggleChip", chipIndex: index })}
                />
              ))}
            </view>
          )}

          {question === null ? null : (
            <view className="sentence-order-screen-bank" data-testid="sentence-order-screen-bank">
              {bankChipIndexes(question, state).map((chipIndex) => (
                <SentenceOrderChip
                  key={chipIndex}
                  index={chipIndex}
                  text={question.chips[chipIndex] ?? ""}
                  placedOrdinal={null}
                  onTap={(index) => dispatch({ type: "toggleChip", chipIndex: index })}
                />
              ))}
            </view>
          )}

          {/* 판정 표식 — design.md §4.6(가), 계약 §1.12.1이 (나) 대신 (가)를 골랐다.
              래퍼에 accessibility-*를 붙이지 않는다 — 둘 다 버렸다(계약 §1.8(c)):
              가림은 낱말까지 지우고, element+라벨은 조작 단위가 아닌 상자에 이름을
              주는 것이다. 이름은 안쪽 `<text>`가 진다. */}
          {question === null || result === null ? null : (
            <view
              className="sentence-order-screen-mark"
              data-testid="sentence-order-screen-mark"
              data-result={result}
            >
              <svg
                className="sentence-order-screen-mark-icon"
                data-testid="sentence-order-screen-mark-icon"
                content={markIconByResult[result]}
                current-color={markIconColorByResult[result]}
              />
              <text className="sentence-order-screen-mark-label">{answerResultLabel(result)}</text>
            </view>
          )}

          {question === null ? (
            <text
              className="sentence-order-screen-complete"
              data-testid="sentence-order-screen-complete"
            >
              문항을 모두 마쳤어요
            </text>
          ) : null}
        </view>
      </scroll-view>

      {/* [고정] 액션 행 — `확인` / `다음` / `결과 보기` 중 정확히 하나 또는 없음
          (계약 §1.8(c)). `data-phase`를 두지 않는다 — 어느 버튼이 있는가로 국면이
          이미 관찰된다. */}
      {question !== null && canCheckArrangement(question, state) ? (
        <view
          className="sentence-order-screen-check"
          data-testid="sentence-order-screen-check"
          accessibility-element={true}
          accessibility-label="확인"
          accessibility-traits="button"
          bindtap={() => dispatch({ type: "check" })}
        >
          <text className="sentence-order-screen-check-label">확인</text>
        </view>
      ) : null}

      {question !== null && state.phase === "checked" ? (
        <view
          className="sentence-order-screen-next"
          data-testid="sentence-order-screen-next"
          accessibility-element={true}
          accessibility-label="다음"
          accessibility-traits="button"
          bindtap={() => dispatch({ type: "nextQuestion" })}
        >
          <text className="sentence-order-screen-next-label">다음</text>
        </view>
      ) : null}

      {question === null ? (
        <view
          className="sentence-order-screen-finish"
          data-testid="sentence-order-screen-finish"
          accessibility-element={true}
          accessibility-label="결과 보기"
          accessibility-traits="button"
          bindtap={() =>
            onFinish(stepId, sentenceOrderSessionResults(questions, state.submittedOrders))
          }
        >
          <text className="sentence-order-screen-finish-label">결과 보기</text>
        </view>
      ) : null}
    </view>
  );
}
