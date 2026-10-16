import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AnswerReveal } from "../../components/AnswerReveal";
import { AnswerVerdict } from "../../components/AnswerVerdict";
import { announce, announceCompletion } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { LearningShell } from "../learning/LearningShell";
import { SyllableBuildWord } from "./SyllableBuildWord";
import { SyllableTile, SyllableTilePlaceholder } from "./SyllableTile";
import {
  canCheckSyllableBuild,
  canPlaceSyllableTile,
  initialSyllableBuildSessionState,
  isSyllableBuildSessionComplete,
  syllableBuildCompletionAnnouncement,
  syllableBuildResultAt,
  syllableBuildSessionReducer,
  syllableBuildSessionResults,
  syllableBuildWordAccessibilityOf,
} from "./syllable-build";
import type { SyllableBuildActivityProps } from "./syllable-build.contract";

import "./syllable-build-screen.css";

// 창고의 음절 타일을 눌러 칸에 낱말을 만드는 활동입니다(카탈로그 SYLLABLE_BUILD). 뼈대는 `LearningShell`이
// 집니다. 이 화면이 아는 것은 카드 **안**(뜻 · 칸 줄 · 정답 공개)과 작업 영역(타일 창고), 그리고 아래
// 버튼이 지금 무엇을 하는가뿐입니다.
//
// 판정은 놓인 글자를 이은 낱말 문자열이라 같은 음절이 두 장이어도 어느 장을 먼저 놓든 정답입니다. 정답
// 음절 수만큼 놓이면 `Check`가 서고, 채점하면 판정 배지와 정답 상자가 서며 타일이 잠깁니다. 맞혀도
// 정답 상자가 보입니다(타자 입력과 같은 규칙). DOM 순서 = 낭독 순서입니다: 판정 → 뜻 → 칸 줄 → 정답
// 상자 → 창고 · 버튼.
export function SyllableBuildActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
}: SyllableBuildActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(
    syllableBuildSessionReducer,
    initialSyllableBuildSessionState,
  );

  const complete = isSyllableBuildSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const result = question == null ? null : syllableBuildResultAt(question, state);
  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );

  // 채점 전이마다 한 번 판정을 낭독합니다.
  useEffect(() => {
    if (question == null || result === null) {
      return;
    }
    announce(copy.common.resultAnnouncement(result));
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `question` · `result`는 그 둘에서 파생하므로
    // 넣지 않습니다(넣으면 같은 채점을 다시 낭독할 수 있습니다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  // 종료 상태가 처음 존재하게 되는 순간 한 번입니다(취소할 자원이 아닙니다).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(syllableBuildCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  // 아래 버튼은 정확히 하나이거나 없습니다 — `See results`(완료) · `Next`(채점 뒤) · `Check`(칸이 다 참).
  // 칸이 덜 찼으면 버튼이 없습니다(「아직 할 수 없다」를 버튼의 부재로 말합니다).
  const action: { label: string; run: () => void; sound?: "none" } | undefined =
    question == null
      ? {
          label: copy.common.seeResults,
          // 이 활동에는 건너뛰기가 없습니다 — 셋째 인자는 늘 0입니다.
          run: () =>
            onFinish(syllableBuildSessionResults(questions, state.submittedTileIndexes), 0),
        }
      : state.phase === "checked"
        ? {
            label: copy.common.next,
            // 레슨의 중간 활동은 마지막 문항 뒤 완료 카드 없이 곧바로 결과를 올립니다.
            run: () =>
              handsOffAfter(lesson, state.questionIndex, questions.length)
                ? onFinish(syllableBuildSessionResults(questions, state.submittedTileIndexes), 0)
                : dispatch({ type: "nextQuestion" }),
          }
        : canCheckSyllableBuild(question, state)
          ? { label: copy.common.check, run: () => dispatch({ type: "check" }), sound: "none" }
          : undefined;

  const bankInteraction =
    question != null && canPlaceSyllableTile(question, state) ? "tappable" : "locked";
  const answerClass =
    result === null
      ? "syllable-build-screen-answer"
      : `syllable-build-screen-answer syllable-build-screen-answer-${result}`;

  return (
    <LearningShell
      form="syllable-build"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      complete={complete}
      instruction={question?.instruction || copy.syllableBuild.instruction}
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      actionSound={action?.sound ?? "button"}
      workspace={
        question == null ? undefined : (
          // 창고 — 타일이 빠져나가도 그 자리에 회색 칸이 남아 배치가 흔들리지 않습니다.
          <view className="syllable-build-screen-bank" data-testid="syllable-build-bank">
            {question.tiles.map((text, tileIndex) =>
              state.placedTileIndexes.includes(tileIndex) ? (
                <SyllableTilePlaceholder key={tileIndex} index={tileIndex} text={text} />
              ) : (
                <SyllableTile
                  key={tileIndex}
                  index={tileIndex}
                  text={text}
                  placedOrdinal={null}
                  interaction={bankInteraction}
                  onTap={(index) =>
                    dispatch({
                      type: "toggleTile",
                      tileIndex: index,
                      slotCount: question.slotCount,
                    })
                  }
                />
              ),
            )}
          </view>
        )
      }
      card={
        <view className="syllable-build-screen-content" data-testid="syllable-build-content">
          {/* 판정 배지 자리입니다 — 비어 있어도 높이를 지켜 배지가 뜨고 질 때 카드가 흔들리지 않습니다. */}
          <view className="syllable-build-screen-verdict-slot">
            {result === null ? null : <AnswerVerdict result={result} />}
          </view>

          {question == null ? (
            <LearningActivityComplete
              questionCount={questions.length}
              testId="syllable-build-complete"
            />
          ) : (
            <>
              {/* 단서입니다 — 만들 낱말의 영어 뜻이고, 한국어 정답은 채점 뒤에만 공개됩니다. */}
              <text
                className="syllable-build-screen-meaning"
                data-testid="syllable-build-meaning"
                accessibility-label={copy.syllableBuild.meaning(question.meaning)}
              >
                {question.meaning}
              </text>

              {/* 답 칸 상자입니다. 테두리가 판정을 따라 색이 바뀌고, 낭독 이름은 안의 칸 줄이 집니다. */}
              <view className={answerClass} data-phase={state.phase}>
                <SyllableBuildWord
                  tiles={question.tiles}
                  slotCount={question.slotCount}
                  placedTileIndexes={state.placedTileIndexes}
                  interaction={state.phase === "checked" ? "locked" : "tappable"}
                  accessibility={syllableBuildWordAccessibilityOf(
                    question,
                    state,
                    copy.syllableBuild,
                  )}
                  onReturn={(tileIndex) =>
                    dispatch({
                      type: "toggleTile",
                      tileIndex,
                      slotCount: question.slotCount,
                    })
                  }
                />
              </view>

              {/* 맞아도 보입니다 — 타자 입력과 같은 규칙입니다. */}
              {state.phase === "checked" ? (
                <AnswerReveal
                  testId="syllable-build-reveal"
                  text={copy.typing.answerReveal(question.answers[0])}
                />
              ) : null}
            </>
          )}
        </view>
      }
    />
  );
}
