import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { LearningShell } from "../learning/LearningShell";
import { ListeningPrompt } from "./ListeningPrompt";
import { ListeningChoice } from "./ListeningChoice";
import { ListeningVerdict } from "./ListeningVerdict";
import {
  answeredResultOf,
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
  // 아래 버튼이 서는 자리는 **세션이 끝났을 때 하나뿐**입니다. 문항 사이는 버튼 없이
  // 스스로 넘어갑니다(아래 `advance`) — 고른 순간 판정이 이미 났고, 그 다음에 할 일은
  // 「다음」 하나뿐이라 누르게 할 이유가 없습니다.
  const action =
    question === null
      ? {
          label: listeningFinishLabel,
          run: () => onFinish(stepId, sessionAnswerResults(questions, state.answeredChoiceIndexes)),
        }
      : undefined;

  // 고른 뒤 2.5초입니다. 배지와 고른 보기의 색을 둘 다 볼 만큼이고, 기다리는 느낌이
  // 아직 안 드는 값으로 골랐습니다. 그 전에 화면을 누르면 즉시 넘어갑니다 — 시간제한이
  // 생기는 자리라 조작을 남깁니다(WCAG 2.2.1).
  const advance =
    question !== null && hasAnswered(state)
      ? {
          label: "다음으로",
          run: () => dispatch({ type: "nextQuestion" }),
          delayMs: 2500,
        }
      : undefined;

  return (
    <LearningShell
      form="listening"
      activityIndex={activityIndex}
      totalActivityCount={totalActivityCount}
      instruction="말의 뜻으로 알맞은 것을 고르세요."
      /* 문항 진행은 카드 **밖**, 세션 헤더의 오른쪽 자리입니다. 카드 안에 두면 한 줄과
         그 간격만큼 카드가 높아지고, 그 높이가 화면 예산을 넘겨 스크롤을 만듭니다 —
         디자인은 874pt 안에 다 들어가는 배치입니다. */
      meta={
        question === null ? undefined : questionProgressLabel(state.questionIndex, questions.length)
      }
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      advance={advance}
      /* 보기는 무대 카드 **밖**입니다(Figma 53-14231) — 카드는 「무엇을 들었나」를
         말하고, 고르는 일은 그 아래 작업 영역에서 합니다. */
      workspace={
        question === null ? undefined : (
          <view className="listening-screen-choices" data-testid="listening-screen-choices">
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
        )
      }
      card={
        <view className="listening-screen-content" data-testid="listening-screen-content">
          {/* 판정 배지 자리입니다. **비어 있어도 자리를 지킵니다** — 배지가 뜨고 질 때
              카드 높이가 흔들리면 그 아래 보기가 함께 밀리고, 밀린 만큼이 화면 밖으로
              나갑니다. 디자인도 카드 위쪽을 이렇게 씁니다(Figma 53-14231: 배지가 y14,
              제시문이 y89 — 배지가 없어도 그 자리는 비어 있습니다).

              **문항이 서 있던 그 카드 안**에서 성공 · 실패가 뒤집힙니다 — 보기의 표식이
              걷힌 뒤로 보이는 판정 채널이 이것 하나입니다. */}
          <view className="listening-screen-verdict-slot">
            {question === null || !hasAnswered(state) ? null : (
              <ListeningVerdict result={answeredResultOf(state, question)} />
            )}
          </view>

          {/* 제시 채널입니다. 오디오가 생기면 **이 컴포넌트만** 통째로 갈립니다. */}
          {question === null ? null : (
            <ListeningPrompt
              text={question.prompt}
              romanization={question.romanization}
              audioSource={question.audioSource}
              sessionOptions={sessionOptions}
            />
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
