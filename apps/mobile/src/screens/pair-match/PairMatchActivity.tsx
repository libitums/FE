import { useEffect, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AnswerReveal } from "../../components/AnswerReveal";
import { AnswerVerdict } from "../../components/AnswerVerdict";
import { announce, announceCompletion } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { LearningShell } from "../learning/LearningShell";
import { PairMatchTile } from "./PairMatchTile";
import {
  canCheckPairs,
  initialPairMatchSessionState,
  isPairMatchSessionComplete,
  pairLinkOf,
  pairMatchCompletionAnnouncement,
  pairMatchResultAt,
  pairMatchRevealText,
  pairMatchSessionReducer,
  pairMatchSessionResults,
  pairMatchTransitionAnnouncement,
  pairTileMarkOf,
  pairTileResultAt,
} from "./pair-match";
import type {
  PairMatchActivityProps,
  PairMatchSessionState,
  PairSide,
} from "./pair-match.contract";

import "./pair-match-activity.css";

// 낱말과 뜻을 잇는 활동입니다(카탈로그 PAIR_MATCH). 문항 하나 = 채점 하나입니다: 짝을 다 맺고 `Check`를
// 한 번 누르면 문항 전체를 판정하고, 틀린 짝의 정답만 공개합니다. 맺는 순간에는 맞고 틀림을 말하지
// 않습니다 — 알리면 소거법으로 전부 맞게 되어 채점이 뜻을 잃습니다.
//
// 뼈대는 `LearningShell`이 집고, 판(두 열)은 카드 **안**입니다(답이 카드 안에서 만들어지고 판정도
// 거기서 뒤집힙니다). 상태와 전이는 순수 모듈이 집고, 이 화면은 그 결과를 그리기만 합니다.
// DOM 순서 = 낭독 순서입니다: 판정(또는 진행) → 낱말 열 → 뜻 열 → 정답 공개 → 버튼.
export function PairMatchActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
}: PairMatchActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(pairMatchSessionReducer, initialPairMatchSessionState);
  const finished = useRef(false);
  const previous = useRef<PairMatchSessionState>(state);

  const complete = isPairMatchSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const result = question == null ? null : pairMatchResultAt(question, state);
  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );

  // 상태가 바뀔 때마다 이음 · 풀림 · 판정을 한 번 낭독합니다. 직전 상태는 ref가 들고 있어서 같은 상태를
  // 다시 그리는 렌더는 낭독하지 않습니다.
  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    const current = questions[state.questionIndex];
    if (current === undefined) return;
    const spoken = pairMatchTransitionAnnouncement(current, before, state, copy);
    if (spoken !== null) announce(spoken);
  }, [state]);

  // 종료 상태가 처음 존재하게 되는 순간 한 번입니다(다른 활동과 같은 규칙 — 취소할 자원이 아닙니다).
  useEffect(() => {
    if (!complete) return;
    announceCompletion(pairMatchCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  // 연타해도 결과는 한 번만 올라갑니다.
  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish(pairMatchSessionResults(questions, state.submitted), 0);
  };

  // 아래 버튼은 정확히 하나이거나 없습니다 — `See results`(완료) · `Next`(확인 뒤) · `Check`(다 맺었을 때).
  // 덜 맺었으면 버튼이 없습니다(「아직 할 수 없다」를 버튼의 부재로 말합니다). 레슨의 중간 활동은 마지막
  // 문항 뒤 완료 카드 없이 곧바로 결과를 올립니다.
  const action: { label: string; run: () => void; sound?: "none" } | undefined =
    question == null
      ? { label: copy.common.seeResults, run: finish }
      : state.phase === "checked"
        ? {
            label: copy.common.next,
            run: () =>
              handsOffAfter(lesson, state.questionIndex, questions.length)
                ? finish()
                : dispatch({ type: "nextQuestion" }),
          }
        : canCheckPairs(question, state)
          ? {
              label: copy.common.check,
              run: () => dispatch({ type: "check", pairCount: question.words.length }),
              sound: "none",
            }
          : undefined;

  const tapTile = (side: PairSide, index: number): void => {
    dispatch({ type: "tapTile", side, index });
  };
  const revealText =
    question == null || state.phase !== "checked"
      ? null
      : pairMatchRevealText(question, state.links, copy);
  const interaction = state.phase === "checked" ? "locked" : "enabled";

  const tileOf = (side: PairSide, index: number): ReactNode => {
    if (question == null) return null;
    const link = pairLinkOf(state.links, side, index);
    const partner =
      link === null
        ? null
        : side === "word"
          ? (question.meanings[link.meaning] ?? null)
          : (question.words[link.word] ?? null);
    return (
      <PairMatchTile
        key={index}
        side={side}
        index={index}
        text={(side === "word" ? question.words[index] : question.meanings[index]) ?? ""}
        mark={pairTileMarkOf(state, side, index)}
        pairOrdinal={link?.ordinal ?? null}
        partnerText={partner}
        result={pairTileResultAt(question, state, side, index)}
        interaction={interaction}
        onTap={tapTile}
      />
    );
  };

  return (
    <LearningShell
      form="pair-match"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      complete={complete}
      instruction={copy.pairMatch.instruction}
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      actionSound={action?.sound ?? "button"}
      // 큰 글자에서 카드가 길어져도 마지막 타일과 `Check`에 닿습니다.
      scrollCard
      card={
        <view
          className="pair-match-activity-content"
          data-testid="pair-match-content"
          data-phase={state.phase}
        >
          {/* 판정 자리입니다 — 맺는 동안은 진행 표식이, 확인 뒤에는 판정 배지가 섭니다. 비어 있어도 높이를
              지켜 배지가 뜨고 질 때 카드가 흔들리지 않습니다. */}
          <view className="pair-match-activity-verdict-slot">
            {question == null ? null : result === null ? (
              <view className="pair-match-activity-progress">
                <text
                  className="pair-match-activity-progress-text"
                  data-testid="pair-match-progress"
                  accessibility-label={copy.pairMatch.progressLabel(
                    state.links.length,
                    question.words.length,
                  )}
                >
                  {copy.pairMatch.progress(state.links.length, question.words.length)}
                </text>
              </view>
            ) : (
              <AnswerVerdict result={result} />
            )}
          </view>

          {question == null ? (
            <LearningActivityComplete
              questionCount={questions.length}
              testId="pair-match-complete"
            />
          ) : (
            <>
              <view className="pair-match-activity-board" data-testid="pair-match-board">
                <view className="pair-match-activity-column" data-testid="pair-match-words">
                  {question.words.map((_, index) => tileOf("word", index))}
                </view>
                <view className="pair-match-activity-column" data-testid="pair-match-meanings">
                  {question.meanings.map((_, index) => tileOf("meaning", index))}
                </view>
              </view>
              {revealText === null ? null : (
                <AnswerReveal testId="pair-match-reveal" text={revealText} />
              )}
            </>
          )}
        </view>
      }
    />
  );
}
