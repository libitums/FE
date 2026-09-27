import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { LearningShell } from "../learning/LearningShell";
import { ListeningPrompt } from "./ListeningPrompt";
import { ListeningChoice } from "./ListeningChoice";
import {
  choiceResultAt,
  hasAnswered,
  initialListeningSessionState,
  isSessionComplete,
  listeningCompletionAnnouncement,
  listeningCompletionText,
  listeningFinishLabel,
  listeningSessionReducer,
  questionProgressLabel,
  questionsForStep,
  sessionAnswerResults,
} from "./listening";
import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";
import type { SessionOptions } from "../../lib/session-options";

import "./listening-screen.css";

// **DOM 순서가 곧 계약입니다** — 낭독 순서 = DOM 순서이므로 시각으로 뒤집지 않습니다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `listeningSessionReducer`를 소비합니다.
// 판정·완료·응답 여부를 상태에 적지 않습니다 — 전부 파생입니다.
//
// **뼈대는 이 화면의 것이 아닙니다**(2026-09-27, Figma 65-14). 상단 바·세션 헤더·
// 지시문·무대 카드·아래 버튼은 `LearningShell`이 집니다. 이 화면이 아는 것은 카드
// **안**에 무엇이 서는가와, 아래 버튼이 지금 무엇을 해야 하는가뿐입니다.
//
// journey-map에서 가져오는 것은 **타입 하나뿐**입니다. `stepOrdinal`은 App이
// `journeyStepOrdinal`로 계산해 내려 주고, 이 화면은 여정 맵의 값을 읽지 않습니다.
export type ListeningScreenProps = {
  stepId: JourneyStepId;
  /** 유닛 안에서 몇 번째 활동인가입니다 — 세션 헤더의 `Chapter n / N`이 이 값에서 납니다. */
  activityIndex: number;
  totalActivityCount: number;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
  sessionOptions: SessionOptions;
};

export function ListeningScreen({
  stepId,
  activityIndex,
  totalActivityCount,
  onExit,
  onFinish,
  sessionOptions,
}: ListeningScreenProps): ReactNode {
  const questions = questionsForStep(stepId);
  const [state, dispatch] = useReducer(listeningSessionReducer, initialListeningSessionState);

  // 완료는 파생입니다. 완료 시점에는 `questionIndex`가 문항 수와 같아 조회할 문항이
  // 없습니다 — 그래서 여기서 한 번만 갈라 아래에서 다시 묻지 않습니다.
  const complete = isSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번입니다(ADR-0016 D11-2).
  // dep이 `complete` 하나입니다 — 리듀서가 `questionIndex`를 늘리기만 하므로 이
  // 파생값은 false→true로 **한 번만** 갈립니다. 그래서 재렌더로는 다시 돌지 않고,
  // 마운트 때 이미 true면 그 순간이 「처음 존재하게 되는 순간」이라 거기서 한 번
  // 돕니다. cleanup이 없습니다 — 낭독은 취소할 수 있는 자원이 아닙니다(D11-2).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(listeningCompletionAnnouncement(listeningFinishLabel));
  }, [complete]);

  // 아래 버튼이 지금 무엇인가입니다. 셋째 갈래는 **버튼이 없는 것**입니다 — 아직
  // 고르지 않았으면 `다음`이 할 일이 없고, 영구히 눌리지 않는 버튼을 두지 않습니다
  // (ADR-0016 D10).
  const action =
    question === null
      ? {
          label: listeningFinishLabel,
          run: () => onFinish(stepId, sessionAnswerResults(questions, state.answeredChoiceIndexes)),
        }
      : hasAnswered(state)
        ? { label: "다음", run: () => dispatch({ type: "nextQuestion" }) }
        : undefined;

  return (
    <LearningShell
      form="listening"
      activityIndex={activityIndex}
      totalActivityCount={totalActivityCount}
      instruction="말의 뜻으로 알맞은 것을 고르세요."
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      card={
        <view className="listening-screen-content" data-testid="listening-screen-content">
          {question === null ? null : (
            <text className="listening-screen-progress" data-testid="listening-screen-progress">
              {questionProgressLabel(state.questionIndex, questions.length)}
            </text>
          )}

          {/* 제시 채널입니다. 오디오가 생기면 **이 컴포넌트만** 통째로 갈립니다. */}
          {question === null ? null : (
            <ListeningPrompt
              text={question.prompt}
              audioSource={question.audioSource}
              sessionOptions={sessionOptions}
            />
          )}

          {question === null ? null : (
            <view className="listening-screen-choices">
              {question.choices.map((choiceText, choiceIndex) => (
                <ListeningChoice
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
          )}

          {/* 완료문입니다. 판정이 카드 안에서 뒤집힌다는 것이 이 자리에서 성립합니다 —
              문항이 서 있던 그 상자에 결과가 대신 섭니다. */}
          {question === null ? (
            <text className="listening-screen-complete" data-testid="listening-screen-complete">
              {listeningCompletionText}
            </text>
          ) : null}
        </view>
      }
    />
  );
}
