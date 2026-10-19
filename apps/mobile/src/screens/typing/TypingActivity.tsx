import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AnswerReveal } from "../../components/AnswerReveal";
import { AnswerVerdict } from "../../components/AnswerVerdict";
import { AudioUnavailableControl } from "../../components/AudioUnavailableControl";
import { announceCompletion } from "../../lib/accessibility";
import { keyboardDockBodyStyle, keyboardDockEdgesOf } from "../../lib/keyboard-dock";
import { useUiCopy } from "../../lib/ui-copy";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { LearningShell } from "../learning/LearningShell";
import { MessengerKeyboard } from "../messenger/MessengerKeyboard";
import {
  canCheckTyping,
  initialTypingSessionState,
  isTypingSessionComplete,
  typedTextOf,
  typingCompletionAnnouncement,
  typingKeyboardDock,
  typingResultAt,
  typingSessionReducer,
  typingSessionResults,
} from "./typing";
import type { TypingActivityProps } from "./typing.contract";

import "./typing-activity.css";

// 한글 자판으로 정답을 쳐서 답하는 활동입니다(카탈로그 받아쓰기 · 한국어로 쓰기 · 패턴 문장 만들기).
// 뼈대(상단 바 · 세션 헤더 · 지시문 · 무대 카드 · 아래 버튼)는 `LearningShell`이 집니다. 이 화면이
// 아는 것은 카드 **안**(단서 · 답 칸 · 정답 공개)과 자판, 그리고 아래 버튼이 지금 무엇을
// 하는가뿐입니다.
//
// 한 문항에 한 번 답합니다. 확인하면 판정 배지와 정답 공개가 서고 자판은 걷히며 `Next`만 남습니다.
// 자판 키 열이 입력의 진실이고(메신저와 같은 원리) 판정은 순수 함수가 집니다 — 이 화면은 그 결과를
// 그리기만 합니다. DOM 순서 = 낭독 순서입니다: 판정 → 단서 → 답 칸 → 정답 공개 → 버튼 → 자판.
export function TypingActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
  insets,
}: TypingActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(typingSessionReducer, initialTypingSessionState);

  const complete = isTypingSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const result = question == null ? null : typingResultAt(question, state);
  const typed = typedTextOf(state);
  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );

  // 종료 상태가 처음 존재하게 되는 순간 한 번입니다(듣기와 같은 규칙 — 취소할 자원이 아닙니다).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(typingCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  // 아래 버튼은 정확히 하나이거나 없습니다 — `See results`(완료) · `Next`(확인 뒤) · `Check`(칠 말이
  // 있을 때). 칠 말이 없으면 버튼이 없습니다(「아직 할 수 없다」를 버튼의 부재로 말합니다).
  const action: { label: string; run: () => void; sound?: "none" } | undefined =
    question == null
      ? {
          label: copy.common.seeResults,
          // 이 활동에는 건너뛰기가 없습니다 — 셋째 인자는 늘 0입니다.
          run: () => onFinish(typingSessionResults(questions, state.submitted), 0),
        }
      : state.phase === "checked"
        ? {
            label: copy.common.next,
            // 레슨의 중간 활동은 마지막 문항 뒤 완료 카드 없이 곧바로 결과를 올립니다.
            run: () =>
              handsOffAfter(lesson, state.questionIndex, questions.length)
                ? onFinish(typingSessionResults(questions, state.submitted), 0)
                : dispatch({ type: "nextQuestion" }),
          }
        : canCheckTyping(state)
          ? { label: copy.common.check, run: () => dispatch({ type: "check" }), sound: "none" }
          : undefined;

  const answerPhaseClass =
    result === null
      ? "typing-activity-answer"
      : `typing-activity-answer typing-activity-answer-${result}`;

  const edges = keyboardDockEdgesOf(insets);
  const dock = typingKeyboardDock(state, questions.length);

  return (
    <view className="typing-activity" data-testid="typing-activity">
      <view
        className="typing-activity-body"
        data-testid="typing-activity-body"
        style={keyboardDockBodyStyle(edges, dock)}
      >
        <LearningShell
          form="typing"
          gemCount={gemCount}
          questionIndex={counter.questionIndex}
          questionCount={counter.questionCount}
          complete={complete}
          instruction={question?.instruction || copy.typing.instruction}
          onExit={onExit}
          actionLabel={action?.label}
          onAction={action?.run}
          actionSound={action?.sound ?? "button"}
          // 카드만 스크롤됩니다 — 큰 글자에서 카드가 길어져도 답 칸에 닿을 수 있고, 아래 버튼은 스크롤
          // 밖에 남습니다. 자판은 껍데기 밖 화면 바닥에 섭니다.
          scrollCard
          card={
            <view className="typing-activity-content" data-testid="typing-activity-content">
              {/* 판정 배지 자리입니다 — 비어 있어도 높이를 지켜 배지가 뜨고 질 때 카드가 흔들리지 않습니다. */}
              <view className="typing-activity-verdict-slot">
                {result === null ? null : <AnswerVerdict result={result} />}
              </view>

              {question == null ? (
                <LearningActivityComplete
                  questionCount={questions.length}
                  testId="typing-activity-complete"
                />
              ) : (
                <>
                  {/* 단서입니다. 받아쓰기는 소리가 아직 없어 로마자와 뜻이 단서이고, 한글 정답은 확인
                  뒤에만 공개됩니다(보이면 베껴 쓰기가 됩니다). */}
                  <view className="typing-activity-cue-block">
                    {question.kind === "dictation" ? (
                      <AudioUnavailableControl testId="typing-activity-audio" />
                    ) : null}
                    <view className="typing-activity-cue-text">
                      <text className="typing-activity-cue" data-testid="typing-activity-cue">
                        {question.cue}
                      </text>
                      {question.kind === "dictation" && question.cueSupport !== null ? (
                        <text
                          className="typing-activity-cue-support"
                          data-testid="typing-activity-cue-support"
                        >
                          {question.cueSupport}
                        </text>
                      ) : null}
                      {question.kind === "pattern" && question.hint !== null ? (
                        <text className="typing-activity-hint" data-testid="typing-activity-hint">
                          {question.hint}
                        </text>
                      ) : null}
                    </view>
                  </view>

                  {/* 답 칸입니다. 이름은 감싼 상자가 지고 글자는 그 안에 보이는 채널로 섭니다. */}
                  <view
                    className={answerPhaseClass}
                    data-testid="typing-activity-answer"
                    data-phase={state.phase}
                    accessibility-element={true}
                    accessibility-label={
                      typed === "" ? copy.typing.answerFieldEmpty : copy.typing.answerField(typed)
                    }
                  >
                    <text className="typing-activity-answer-text">{typed}</text>
                  </view>

                  {/* 맞아도 보입니다 — 문장 부호 · 띄어쓰기의 본보기를 한 번 더 봅니다. */}
                  {state.phase === "checked" ? (
                    <AnswerReveal
                      testId="typing-activity-reveal"
                      text={copy.typing.answerReveal(question.answers[0])}
                    />
                  ) : null}
                </>
              )}
            </view>
          }
        />
      </view>
      {dock === "keyboard" ? (
        <MessengerKeyboard
          shifted={state.shifted}
          onPress={(key) => dispatch({ type: "press", key })}
          onBackspace={() => dispatch({ type: "backspace" })}
          onShift={() => dispatch({ type: "shift" })}
          edges={edges}
        />
      ) : null}
    </view>
  );
}
