import { useEffect, useMemo, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { LearningShell } from "../learning/LearningShell";
import { AnswerVerdict } from "../../components/AnswerVerdict";
import { WordChoiceOption } from "./WordChoiceOption";
import {
  answeredResultOf,
  choiceResultAt,
  hasAnswered,
  initialWordChoiceSessionState,
  isWordChoiceSessionComplete,
  wordChoiceCompletionAnnouncement,
  wordChoiceCompletionText,
  wordChoiceFinishLabel,
  wordChoiceQuestionsForStep,
  wordChoiceSessionReducer,
  wordChoiceSessionResults,
} from "./word-choice";
import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

import "./word-choice-screen.css";

// `ListeningScreen`의 형태를 그대로 잇되 **제시 채널에서 오디오가 빠집니다**
// — `ListeningPrompt` · `lib/audio.ts` · 재생 상태를 이 화면이 가져오지
// 않습니다. 제시문은 `<text>` 하나입니다 — 카드 표면을 두지 않습니다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `wordChoiceSessionReducer`를
// 소비합니다. 판정·완료·응답 여부를 상태에 적지 않습니다 — 전부 파생입니다.
//
// **뼈대는 이 화면의 것이 아닙니다** ⟨2026-09-28⟩. 상단 바·세션 헤더·지시문·무대
// 카드·아래 버튼은 `LearningShell`이 집니다(ADR-0022 D1-2). 이 화면이 아는 것은
// 카드 **안**에 무엇이 서는가와 작업 영역에 무엇이 서는가뿐입니다.
//
// ⟨2026-09-28, Figma 65-327⟩ **이 화면의 디자인이 왔습니다.** 옮겨만 뒀던 두 자리가
// 그것으로 갈렸습니다: 보기의 ✓/✗ 표식이 걷히고 판정은 무대 카드의 배지가 내며,
// 보기는 줄을 채우는 행이 아니라 낱말만 한 칩이 가로로 섭니다. 배지는 듣기와 같은
// 조각(`components/AnswerVerdict`)입니다 — 두 화면이 같은 말을 같은 모양으로 합니다.
export type WordChoiceScreenProps = {
  stepId: JourneyStepId;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[], skippedCount: number) => void;
};

export function WordChoiceScreen({ stepId, onExit, onFinish }: WordChoiceScreenProps): ReactNode {
  const questions = wordChoiceQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(wordChoiceSessionReducer, initialWordChoiceSessionState);

  // 완료는 파생입니다. 완료 시점에는 `questionIndex`가 문항 수와 같아
  // 조회할 문항이 없습니다 — 여기서 한 번만 갈라 아래에서 다시 묻지
  // 않습니다.
  const complete = isWordChoiceSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번입니다(ADR-0016 D11-2).
  // dep이 `complete` 하나입니다 — 리듀서가 `questionIndex`를 늘리기만 하므로
  // 이 파생값은 false→true로 **한 번만** 갈립니다. 그래서 재렌더로는 다시
  // 돌지 않고, 마운트 때 이미 true면 그 순간이 「처음 존재하게 되는 순간」이라
  // 거기서 한 번 돕니다. cleanup이 없습니다 — 낭독은 취소할 수 있는 자원이
  // 아닙니다(D11-2).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(wordChoiceCompletionAnnouncement(wordChoiceFinishLabel));
  }, [complete]);

  // 세션이 끝난 뒤에만 아래 버튼이 섭니다 — 문항 사이는 넘김 층이 집니다(듣기와 같은
  // 규약입니다). 「끝났다」와 「무엇이 일어났는지」만 넘기고 통과 여부는 계산하지도,
  // 알지도 않습니다 — 그 판정은 평가가 집니다.
  const action =
    question === null
      ? {
          label: wordChoiceFinishLabel,
          // 이 화면에는 건너뛰기가 없습니다 — 셋째 인자는 늘 0입니다(D8, speaking만 다른 값을 냅니다).
          run: () =>
            onFinish(stepId, wordChoiceSessionResults(questions, state.answeredChoiceIndexes), 0),
        }
      : undefined;

  // 고른 뒤 2.5초입니다 — 듣기와 같은 값입니다. 두 화면의 기다림이 다르면 「이 화면은
  // 왜 더 오래 걸리지」가 조작이 아니라 화면의 성격으로 읽힙니다.
  //
  // **참조가 곧 걸음의 정체입니다**(껍데기가 그것으로 타이머를 갈고 겹침을 막습니다).
  // 매 렌더 새로 만들면 관계없는 리렌더 하나가 기다림을 처음부터 되돌립니다.
  const advance = useMemo(
    () =>
      question !== null && hasAnswered(state)
        ? {
            label: "다음으로",
            run: () => dispatch({ type: "nextQuestion" }),
            delayMs: 2500,
          }
        : undefined,
    [question, state.selectedChoiceIndex],
  );

  return (
    <LearningShell
      form="word-choice"
      // 세션 헤더가 세는 것은 문항입니다. 완료 상태에는 지금 푸는 문항이 없으므로
      // 마지막 문항 자리에 둡니다 — 문항이 0개인 스텝에서는 계약이 순번을 안 읽습니다.
      questionIndex={question === null ? Math.max(0, questions.length - 1) : state.questionIndex}
      questionCount={questions.length}
      instruction="문항에 알맞은 단어를 고르세요."
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      advance={advance}
      /* 보기는 무대 카드 **밖**입니다 — 카드는 「무엇을 묻나」를 말하고, 고르는 일은
         그 아래 작업 영역에서 합니다.

         낱말 고르기의 보기는 듣기와 **모양이 다릅니다**(Figma 65-327). 줄을 채우는
         행이 아니라 낱말만 한 칩이 가로로 나란히 섭니다 — 고르는 것이 문장이 아니라
         낱말이라, 폭이 낱말의 길이를 말하는 것이 읽기에 낫습니다. */
      workspace={
        question === null ? undefined : (
          <view className="word-choice-screen-options">
            {question.choices.map((choiceText, choiceIndex) => (
              <WordChoiceOption
                key={choiceIndex}
                index={choiceIndex}
                text={choiceText}
                // 판정을 지는 보기는 고른 하나뿐입니다 — 고르지 않은 정답 보기는
                // null입니다.
                result={choiceResultAt(state, question, choiceIndex)}
                onSelect={(index) => dispatch({ type: "selectChoice", choiceIndex: index })}
              />
            ))}
          </view>
        )
      }
      card={
        // 문항 상태든 완료 상태든 **언제나 서는 상자**입니다 — 이 화면의 정체를 가리는
        // 앵커가 이것입니다(듣기의 `listening-screen-content`와 같은 자리). 제시문은
        // 문항이 있을 때만 서므로 앵커가 될 수 없습니다: 실물 문항 표가 아직 비어 있어
        // 마운트가 곧 완료인 갈래가 있습니다.
        <view className="word-choice-screen-content" data-testid="word-choice-screen-content">
          {/* 판정 배지 자리입니다 — 비어 있어도 높이를 지킵니다. 배지가 뜨고 질 때 카드
              높이가 흔들리면 그 아래 보기가 함께 밀립니다(듣기가 같은 자리를 같은
              이유로 비워 둡니다). 디자인도 카드 위쪽을 이렇게 씁니다(Figma 65-327). */}
          <view className="word-choice-screen-verdict-slot">
            {question === null || !hasAnswered(state) ? null : (
              <AnswerVerdict result={answeredResultOf(state, question)} />
            )}
          </view>

          {question === null ? null : (
            <text className="word-choice-screen-prompt" data-testid="word-choice-screen-prompt">
              {question.prompt}
            </text>
          )}

          {/* 완료문입니다. 문항이 서 있던 그 카드 안에 결과가 대신 섭니다. */}
          {question === null ? (
            <text className="word-choice-screen-complete" data-testid="word-choice-screen-complete">
              {wordChoiceCompletionText}
            </text>
          ) : null}

          {/* 배지 자리와 마주 보는 빈 자리입니다 — 왜 필요한지는 CSS에 적혀 있습니다.
              언제나 섭니다: 배지 자리도 언제나 서므로, 조건부로 두면 완료 상태에서만
              다시 쏠립니다. */}
          <view className="word-choice-screen-verdict-balance" />
        </view>
      }
    />
  );
}
