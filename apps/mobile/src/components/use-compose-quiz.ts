// 합치기 퀴즈의 진행 · 판정 낭독 · 정답 뒤 음절 소리입니다(ADR-0169 · ADR-0173). Letters › Practice와 입장 전 기초
// (ADR-0176)가 함께 씁니다 — 다른 것은 바깥 틀과 다 끝낸 뒤뿐입니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { announce, announceCompletion } from "../lib/accessibility";
import {
  COMPOSE_ECHO_DELAY_MS,
  COMPOSE_ROUNDS,
  composeEchoOf,
  composeReducer,
  composeVerdictOf,
  initialComposeState,
} from "../lib/letters/compose-quiz";
import type {
  ComposeAction,
  ComposeRound,
  ComposeState,
  ComposeVerdict,
} from "../lib/letters/compose-quiz";
import { composeSyllable } from "../lib/letters/jamo";
import type { LetterSoundPort } from "../lib/letters/letter-sound.contract";
import type { AutoPlayAudio } from "../lib/question-audio";
import { useUiCopy } from "../lib/ui-copy";

export type ComposeQuiz = {
  readonly state: ComposeState;
  readonly round: ComposeRound;
  /** 이 문제에서 만들 음절. */
  readonly target: string;
  readonly verdict: ComposeVerdict | null;
  readonly dispatch: (action: ComposeAction) => void;
  readonly playTarget: () => void;
};

export function useComposeQuiz({
  sound,
  autoPlay,
  onAnswered,
  onComplete,
}: {
  readonly sound: LetterSoundPort;
  readonly autoPlay: AutoPlayAudio;
  /** 판정마다 — round는 1부터. */
  readonly onAnswered?: ((round: number, target: string, correct: boolean) => void) | undefined;
  readonly onComplete?: ((rounds: number, firstTry: number) => void) | undefined;
}): ComposeQuiz {
  const uiCopy = useUiCopy();
  const [state, setState] = useState<ComposeState>(initialComposeState);
  const round = COMPOSE_ROUNDS[state.round] ?? COMPOSE_ROUNDS[0]!;
  const target = composeSyllable(round.consonant, round.vowel);

  // 맞힌 판정의 음절 소리 — 효과음과 겹치지 않게 틈을 두고 한 번. 라운드가 넘어가거나 화면을 떠나면 걷습니다.
  // 결선은 그릴 때마다 포트를 새로 만들 수 있어 최신 포트를 ref로 읽습니다(틈이 다시 시작되지 않게).
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  });
  const echo = autoPlay === "off" ? null : composeEchoOf(state);
  useEffect(() => {
    if (echo === null) return undefined;
    const handle = setTimeout(() => {
      const source = soundRef.current.sourceOf(echo);
      if (source !== null) soundRef.current.play(source);
    }, COMPOSE_ECHO_DELAY_MS);
    return () => clearTimeout(handle);
  }, [echo, state.round]);

  const dispatch = (action: ComposeAction) => {
    const next = composeReducer(state, action);
    if (next === state) return;
    setState(next);
    const judged = composeVerdictOf(next);
    if (
      action.type === "pick" &&
      judged !== null &&
      next.consonant !== null &&
      next.vowel !== null
    ) {
      onAnswered?.(next.round + 1, target, judged === "correct");
      announce(uiCopy.common.resultAnnouncement(judged));
    }
    if (action.type === "next" && next.done) {
      onComplete?.(COMPOSE_ROUNDS.length, next.firstTry);
      announceCompletion(uiCopy.more.compose.complete);
    }
  };

  const playTarget = () => {
    const source = sound.sourceOf(target);
    if (source !== null) sound.play(source);
  };

  return {
    state,
    round,
    target,
    verdict: state.done ? null : composeVerdictOf(state),
    dispatch,
    playTarget,
  };
}
