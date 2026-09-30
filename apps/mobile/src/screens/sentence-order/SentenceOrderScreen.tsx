import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { announce, announceCompletion } from "../../lib/accessibility";
import type { AnswerResult } from "../../lib/answer-result";
import { LearningShell } from "../learning/LearningShell";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { SentenceOrderChip, SentenceOrderChipPlaceholder } from "./SentenceOrderChip";
import {
  canCheckArrangement,
  canPlaceChip,
  composedSentence,
  initialSentenceOrderSessionState,
  isSentenceOrderSessionComplete,
  sentenceOrderAnnouncement,
  sentenceOrderCompletionAnnouncement,
  sentenceOrderQuestionsForStep,
  sentenceOrderResultAt,
  sentenceOrderSessionReducer,
  sentenceOrderSessionResults,
} from "./sentence-order";
import type { JourneyStepId } from "../journey-map/journey-map";

import "./sentence-order-screen.css";

// 문장 만들기(Figma 65-14)입니다. 상단 바 · 세션 헤더 · 지시문 · 무대 카드 · 작업 영역 ·
// 아래 버튼은 `LearningShell`이 집니다. 이 화면이 아는 것은 카드 **안**(대화 · 답 칸 줄)과
// 작업 영역(낱말 창고), 그리고 아래 버튼이 지금 무엇을 하는가뿐입니다.
//
// 대화 카드의 왼쪽 말풍선이 상대의 말(`prompt`)이고, 학습자는 그 말에 답하는 문장을 창고의
// 조각으로 만듭니다. 창고에는 오답 낱말이 섞여 있고, 정답 길이만큼 놓으면 확인할 수 있습니다.
export type SentenceOrderScreenProps = {
  stepId: JourneyStepId;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[], skippedCount: number) => void;
};

/** 내 말풍선이 비어 있을 때의 표시입니다 — 디자인 표기 그대로입니다. */
const emptyReplyMark = "----";

export function SentenceOrderScreen({
  stepId,
  onExit,
  onFinish,
}: SentenceOrderScreenProps): ReactNode {
  const copy = useUiCopy();
  const questions = sentenceOrderQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(
    sentenceOrderSessionReducer,
    initialSentenceOrderSessionState,
  );

  const complete = isSentenceOrderSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const result = question == null ? null : sentenceOrderResultAt(question, state);

  // 채점 전이마다 한 번 판정을 낭독합니다.
  useEffect(() => {
    if (question == null || result === null) {
      return;
    }
    announce(sentenceOrderAnnouncement(result, copy));
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `question` · `result`는 그 둘에서 파생하므로
    // 넣지 않습니다(넣으면 같은 채점을 다시 낭독할 수 있습니다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(sentenceOrderCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  const toggle = (chipIndex: number) => dispatch({ type: "toggleChip", chipIndex });

  // 아래 버튼은 정확히 하나이거나 없습니다 — `확인`(칸이 다 참) · `다음`(채점 뒤) · `결과
  // 보기`(완료). 칸이 덜 찼으면 버튼이 없습니다(「아직 할 수 없다」를 버튼의 부재로 말합니다).
  const action =
    question == null
      ? {
          label: copy.common.seeResults,
          // 이 화면에는 건너뛰기가 없습니다 — 셋째 인자는 늘 0입니다(D8, speaking만 다른 값을 냅니다).
          run: () =>
            onFinish(stepId, sentenceOrderSessionResults(questions, state.submittedOrders), 0),
        }
      : state.phase === "checked"
        ? { label: copy.common.next, run: () => dispatch({ type: "nextQuestion" }) }
        : canCheckArrangement(question, state)
          ? { label: copy.common.check, run: () => dispatch({ type: "check" }) }
          : undefined;

  const bankFull = question == null ? true : !canPlaceChip(question, state);

  return (
    <LearningShell
      form="sentence-order"
      questionIndex={question == null ? Math.max(0, questions.length - 1) : state.questionIndex}
      questionCount={questions.length}
      complete={complete}
      instruction={question?.support?.instruction ?? copy.sentenceOrder.instruction}
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      workspace={
        question == null ? undefined : (
          // 창고 — 조각이 빠져나가도 그 자리에 회색 칸이 남아 배치가 흔들리지 않습니다.
          <view className="sentence-order-screen-bank" data-testid="sentence-order-screen-bank">
            {question.chips.map((text, chipIndex) =>
              state.placedChipIndexes.includes(chipIndex) ? (
                <SentenceOrderChipPlaceholder key={chipIndex} index={chipIndex} text={text} />
              ) : (
                <SentenceOrderChip
                  key={chipIndex}
                  index={chipIndex}
                  text={text}
                  placedOrdinal={null}
                  disabled={bankFull}
                  onTap={toggle}
                />
              ),
            )}
          </view>
        )
      }
      card={
        <view className="sentence-order-screen-content" data-testid="sentence-order-screen-content">
          {/* 판정 배지 자리 — 비어 있어도 자리를 지켜 카드 높이가 흔들리지 않습니다(듣기와 같음). */}
          <view className="sentence-order-screen-verdict-slot">
            {result === null ? null : <AnswerVerdict result={result} />}
          </view>

          {question == null ? (
            <LearningActivityComplete
              questionCount={questions.length}
              testId="sentence-order-screen-complete"
            />
          ) : (
            <>
              {/* 상대의 말 — 왼쪽 말풍선. */}
              <view className="sentence-order-screen-partner">
                <text
                  className="sentence-order-screen-partner-text"
                  data-testid="sentence-order-screen-prompt"
                >
                  {question.prompt}
                </text>
                {question.support === undefined ? null : (
                  <>
                    <text
                      className="sentence-order-screen-support"
                      data-testid="sentence-order-screen-romanization"
                    >
                      {question.support.romanization}
                    </text>
                    <text
                      className="sentence-order-screen-support"
                      data-testid="sentence-order-screen-translation"
                    >
                      {question.support.translation}
                    </text>
                  </>
                )}
              </view>

              {/* 내 말 — 오른쪽 말풍선. 채우는 동안은 빈 표시(`----`)이고 낭독하지 않습니다.
                  채점하면 만든 문장이 섭니다. */}
              <view
                className="sentence-order-screen-reply"
                data-testid="sentence-order-screen-reply"
                accessibility-elements-hidden={state.phase !== "checked"}
              >
                <text className="sentence-order-screen-reply-text">
                  {state.phase === "checked"
                    ? composedSentence(question, state.placedChipIndexes)
                    : emptyReplyMark}
                </text>
              </view>

              {/* 답 칸 줄 — 놓인 조각이 순서대로 섭니다. 누르면 창고로 돌아갑니다. 위아래
                  가는 선이 줄의 자리를 보입니다. */}
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
                    disabled={state.phase === "checked"}
                    onTap={toggle}
                  />
                ))}
              </view>
            </>
          )}
        </view>
      }
    />
  );
}
