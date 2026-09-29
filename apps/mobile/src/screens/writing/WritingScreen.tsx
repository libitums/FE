import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { SyllableSlots } from "../../components/SyllableSlots";
import { WritingCanvas, type WritingCanvasBadge } from "../../components/WritingCanvas";
import { WritingPrompt } from "../../components/WritingPrompt";
import { useWritingPractice } from "../../components/use-writing-practice";
import { announceCompletion } from "../../lib/accessibility";
import type { AnswerResult } from "../../lib/answer-result";
import type { WritingQuestion } from "../../lib/writing-session";
import { LearningShell } from "../learning/LearningShell";
import type { JourneyStepId } from "../journey-map/journey-map";
import {
  finishWritingQuestion,
  initialWritingScreenState,
  writingCompletionAnnouncement,
  writingCompletionText,
  writingFinishLabel,
  writingQuestionsForStep,
  writingUnmeasurableNotice,
} from "./writing";

import "./writing-screen.css";

// 쓰기 학습형입니다. 뼈대는 `LearningShell`이 집니다 — 카드 안에 빈칸 문장 · 음절 칸 · 쓰기
// 캔버스가 서고, 빈칸의 음절을 하나씩 흐린 안내 위에 따라 씁니다. 쓰기의 핵심(흐름 · 판정 ·
// 캔버스)은 최종 테스트와 함께 쓰는 공용이고, 이 화면이 아는 것은 문항 사이의 흐름과 아래
// 버튼이 지금 무엇을 하는가입니다.
//
// 캔버스를 작업 영역(스크롤)이 아니라 **무대 카드** 안에 둡니다 — 그리기 표면은 스크롤과 같은
// 제스처를 다투면 무엇이 이기는지 확인된 적이 없습니다(`components/DrawingSurface.tsx`).

export type WritingScreenProps = {
  stepId: JourneyStepId;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
};

export function WritingScreen({ stepId, onExit, onFinish }: WritingScreenProps): ReactNode {
  const questions = writingQuestionsForStep(stepId);
  const [screenState, setScreenState] = useState(initialWritingScreenState);
  const question = questions[screenState.questionIndex] ?? null;
  const complete = question === null;

  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(writingCompletionAnnouncement(writingFinishLabel));
  }, [complete]);

  return question === null ? (
    <LearningShell
      form="writing"
      questionIndex={Math.max(0, questions.length - 1)}
      questionCount={questions.length}
      instruction="빈칸의 글자를 따라 써 보세요."
      onExit={onExit}
      actionLabel={writingFinishLabel}
      onAction={() => onFinish(stepId, screenState.results)}
      card={
        <view className="writing-screen-content" data-testid="writing-screen-content">
          <text className="writing-screen-complete" data-testid="writing-screen-complete">
            {writingCompletionText}
          </text>
        </view>
      }
    />
  ) : (
    <WritingQuestionShell
      // 문항이 바뀌면 음절 흐름을 처음부터 새로 씁니다 — 훅의 상태가 문항 하나의 것입니다.
      key={question.id}
      question={question}
      questionIndex={screenState.questionIndex}
      questionCount={questions.length}
      onExit={onExit}
      onQuestionDone={(result) => setScreenState((state) => finishWritingQuestion(state, result))}
    />
  );
}

type WritingQuestionShellProps = {
  readonly question: WritingQuestion;
  readonly questionIndex: number;
  readonly questionCount: number;
  readonly onExit: () => void;
  readonly onQuestionDone: (result: AnswerResult | null) => void;
};

function WritingQuestionShell({
  question,
  questionIndex,
  questionCount,
  onExit,
  onQuestionDone,
}: WritingQuestionShellProps): ReactNode {
  const practice = useWritingPractice({ question, size: "card", onQuestionDone });
  const { state } = practice;

  // 아래 버튼 — 쓰는 중에 획이 있으면 `확인하기`, 판정 · 잴 수 없음 뒤면 `다음`입니다. 빈 판과
  // 재는 중에는 버튼이 없습니다 — 누를 수 없는 버튼을 두지 않습니다(ADR-0016 D10).
  const action =
    practice.check !== null
      ? { label: "확인하기", run: practice.check }
      : practice.next !== null
        ? { label: "다음", run: practice.next }
        : null;

  const badge: WritingCanvasBadge =
    state.phase === "judged" && state.verdict !== null
      ? { kind: "verdict", result: state.verdict }
      : state.phase === "unmeasurable"
        ? { kind: "notice", text: writingUnmeasurableNotice }
        : { kind: "none" };

  return (
    <LearningShell
      form="writing"
      questionIndex={questionIndex}
      questionCount={questionCount}
      instruction="빈칸의 글자를 따라 써 보세요."
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      card={
        <view
          className="writing-screen-content"
          data-testid="writing-screen-content"
          data-phase={state.phase}
        >
          <WritingPrompt question={question} />
          <text className="writing-screen-translation" data-testid="writing-screen-translation">
            {question.translation}
          </text>
          <SyllableSlots syllables={question.syllables} currentIndex={state.syllableIndex} />
          {practice.syllable === null ? null : (
            <WritingCanvas
              size="card"
              glyph={practice.syllable}
              guide={practice.guide}
              strokes={state.strokes}
              badge={badge}
              erase={practice.erase}
              onStrokeComplete={practice.addStroke}
            />
          )}
        </view>
      }
    />
  );
}
