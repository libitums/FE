import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { ComposeQuizBank, ComposeQuizCard } from "../../components/ComposeQuizParts";
import { useComposeQuiz } from "../../components/use-compose-quiz";
import type { ComposeQuiz } from "../../components/use-compose-quiz";
import { announce } from "../../lib/accessibility";
import { COMPOSE_ROUNDS } from "../../lib/letters/compose-quiz";
import { jamoTileRomanOf } from "../../lib/letters/jamo";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { LearningShell } from "../learning/LearningShell";
import { lettersTestIds as ids, type LettersComposeScreenProps } from "./letters.contract";

import "./letters-compose.css";

// 합치기 퀴즈(ㄱ + ㅏ = 가)입니다(ADR-0169, 시안 JamoCompose). 뼈대는 레슨의 `LearningShell`(머리 캡션 · 판정 배지 · 아래 단추),
// 문제 줄 · 타일 · 판정 · 소리는 입장 전 기초와 같은 부품(`ComposeQuizParts` · `useComposeQuiz`, ADR-0176)입니다. 두 칸이 차면 합친
// 글자가 결과 칸에 서고 곧바로 판정합니다 — 맞으면 Next(마지막은 완료), 틀리면 Try again. 맞히면 정답 효과음이 끝난 뒤 그 음절
// 소리가 한 번 납니다(ADR-0173 — Auto-play가 꺼져 있거나 소리 파일이 아직 없으면 조용히 넘어갑니다). 레슨 기록 · 티켓과 무관한 연습입니다.
export function LettersComposeScreen({
  romanization,
  sound,
  autoPlay = "on",
  onExit,
  onAnswered,
  onComplete,
}: LettersComposeScreenProps): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.more.compose;
  const base = useComposeQuiz({ sound, autoPlay, onAnswered, onComplete });
  const [hint, setHint] = useState(false);
  // 안내는 이 문제의 첫소리입니다 — 고르기 밖의 동작(비우기 · 다음 · 다시)이면 걷습니다.
  const quiz: ComposeQuiz = {
    ...base,
    dispatch: (next) => {
      if (next.type !== "pick") setHint(false);
      base.dispatch(next);
    },
  };
  const { state, round, verdict } = quiz;

  const action = state.done
    ? { label: copy.done, run: onExit }
    : verdict === "correct"
      ? { label: uiCopy.common.next, run: () => quiz.dispatch({ type: "next" }) }
      : verdict === "incorrect"
        ? { label: copy.tryAgain, run: () => quiz.dispatch({ type: "retry" }) }
        : undefined;

  const handleHint = () => {
    "background only";
    playSound("button");
    setHint(true);
    announce(copy.hintText(jamoTileRomanOf(round.consonant)));
  };
  return (
    <view className="letters-compose" data-testid={ids.compose}>
      <LearningShell
        form="syllable-build"
        formLabel={copy.formLabel}
        questionIndex={state.round}
        questionCount={COMPOSE_ROUNDS.length}
        complete={state.done}
        instruction={copy.instruction}
        onExit={onExit}
        actionLabel={action?.label}
        onAction={action?.run}
        verdict={verdict ?? undefined}
        workspace={
          state.done ? undefined : (
            <view className="letters-compose-workspace">
              <view
                className="letters-compose-hint"
                data-testid={ids.composeHint}
                accessibility-element={true}
                flatten={false}
                accessibility-label={copy.hint}
                accessibility-traits="button"
                bindtap={handleHint}
              >
                <text className="letters-compose-hint-label">{copy.hint}</text>
              </view>
              {hint && verdict === null ? (
                <text className="letters-compose-hint-text" data-testid={ids.composeHintText}>
                  {copy.hintText(jamoTileRomanOf(round.consonant))}
                </text>
              ) : null}
              <ComposeQuizBank quiz={quiz} romanization={romanization} />
            </view>
          )
        }
        card={
          state.done ? (
            <text className="letters-compose-complete">{copy.complete}</text>
          ) : (
            <ComposeQuizCard quiz={quiz} romanization={romanization} />
          )
        }
      />
    </view>
  );
}
