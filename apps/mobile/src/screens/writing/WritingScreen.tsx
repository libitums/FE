import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { SyllableSlots } from "../../components/SyllableSlots";
import { WritingCanvas, type WritingCanvasBadge } from "../../components/WritingCanvas";
import { WritingPrompt } from "../../components/WritingPrompt";
import { useWritingPractice } from "../../components/use-writing-practice";
import { announceCompletion } from "../../lib/accessibility";
import type { AnswerResult } from "../../lib/answer-result";
import type { WritingQuestion } from "../../lib/writing-session";
import { LearningShell } from "../learning/LearningShell";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import type { JourneyStepId } from "../journey-map/journey-map";
import {
  finishWritingQuestion,
  initialWritingScreenState,
  writingCompletionAnnouncement,
  writingQuestionsForStep,
} from "./writing";

import "./writing-screen.css";

// 쓰기 학습형입니다. 뼈대는 `LearningShell`이 집니다 — 형제 학습형과 같은 배치로, 무대 카드에
// 판정 자리 · 빈칸 문장 · 번역 · 음절 칸이, 카드 아래 작업 영역에 쓰기 캔버스가 섭니다. 빈칸의
// 음절을 하나씩 흐린 안내 위에 따라 씁니다. 쓰기의 핵심(흐름 · 판정 ·
// 캔버스)은 최종 테스트와 함께 쓰는 공용이고, 이 화면이 아는 것은 문항 사이의 흐름과 아래
// 버튼이 지금 무엇을 하는가입니다.

export type WritingScreenProps = {
  stepId: JourneyStepId;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
};

export function WritingScreen({ stepId, onExit, onFinish }: WritingScreenProps): ReactNode {
  const copy = useUiCopy();
  const questions = writingQuestionsForStep(stepId);
  const [screenState, setScreenState] = useState(initialWritingScreenState);
  const question = questions[screenState.questionIndex] ?? null;
  const complete = question === null;

  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(writingCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  return question === null ? (
    <LearningShell
      form="writing"
      questionIndex={Math.max(0, questions.length - 1)}
      questionCount={questions.length}
      complete={complete}
      instruction={copy.writing.instruction}
      onExit={onExit}
      actionLabel={copy.common.seeResults}
      onAction={() => onFinish(stepId, screenState.results)}
      card={
        <view className="writing-screen-content" data-testid="writing-screen-content">
          <LearningActivityComplete
            questionCount={questions.length}
            testId="writing-screen-complete"
          />
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
  const copy = useUiCopy();
  const practice = useWritingPractice({ question, size: "workspace", onQuestionDone });
  const { state } = practice;

  // 아래 버튼 — 쓰는 중에 획이 있으면 `확인하기`, 판정 · 잴 수 없음 뒤면 `다음`입니다. 빈 판과
  // 재는 중에는 버튼이 없습니다 — 누를 수 없는 버튼을 두지 않습니다(ADR-0016 D10).
  //
  // 판정 뒤 넘김은 문장 만들기처럼 **버튼**입니다. 듣기 · 말하기의 스스로 넘어가는 층(`advance`)은
  // 화면 전체를 덮어 누르면 넘어가는데, 쓰기는 틀린 뒤 캔버스의 `다시 쓰기`를 누를 수 있어야
  // 하고 그 층이 그 버튼을 가립니다.
  const action =
    practice.check !== null
      ? { label: copy.common.check, run: practice.check }
      : practice.next !== null
        ? { label: copy.common.next, run: practice.next }
        : null;

  // 판정은 형제 학습형처럼 **카드의 판정 자리**에 섭니다. 캔버스 위에는 잴 수 없을 때의 안내
  // 한 줄만 섭니다 — 그 안내는 판에 대한 말이라 판 위가 맞습니다.
  const badge: WritingCanvasBadge =
    state.phase === "unmeasurable"
      ? { kind: "notice", text: copy.writing.recognitionUnavailable }
      : { kind: "none" };

  return (
    <LearningShell
      form="writing"
      questionIndex={questionIndex}
      questionCount={questionCount}
      instruction={copy.writing.instruction}
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      // 그리기 표면이 서는 작업 영역이라 스크롤을 끕니다(`workspaceScrolls`의 근거).
      workspaceScrolls={false}
      card={
        <view
          className="writing-screen-content"
          data-testid="writing-screen-content"
          data-phase={state.phase}
        >
          {/* 판정 배지 자리 — 비어 있어도 자리를 지켜 카드 높이가 흔들리지 않습니다. */}
          <view className="writing-screen-verdict-slot">
            {state.phase === "judged" && state.verdict !== null ? (
              <AnswerVerdict result={state.verdict} />
            ) : null}
          </view>
          <WritingPrompt question={question} tone="plain" />
          <text className="writing-screen-translation" data-testid="writing-screen-translation">
            {question.translation}
          </text>
          <SyllableSlots syllables={question.syllables} currentIndex={state.syllableIndex} />
        </view>
      }
      workspace={
        <view className="writing-screen-workspace" data-testid="writing-screen-workspace">
          {practice.syllable === null ? null : (
            <WritingCanvas
              size="workspace"
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
