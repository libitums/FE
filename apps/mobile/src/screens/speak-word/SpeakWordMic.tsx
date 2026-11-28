// 낱말 말하기의 마이크 권한 · 실패 결선입니다(ADR-0206) — 사전 안내 · 거부 시트(`useMicPermission`), 말하기 결선(`useSpeechAttempt`),
// 「이 레슨의 말하기 건너뜀」(남은 문항을 건너뜀으로 보고하고 결과를 올림), 두 번 실패한 뒤의 「Hear it」을 한 자리에 둡니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import type { MicPermission } from "../../components/mic-permission/use-mic-permission";
import { useMicSpeechAttempt } from "../../components/mic-permission/use-mic-speech-attempt";
import type { SpeechAttemptControl } from "../../components/use-speech-attempt";
import type { ItemAnswerReporter } from "../../lib/item-answer";
import type { ActivityFinish } from "../learning/activity-finish";
import type { LearningDensity } from "../../lib/learning-density";
import type { MicPermissionContext } from "../../lib/mic-permission-event.contract";
import { playSound } from "../../lib/sound-effects";
import {
  hearAnswerAfterFailures,
  speechFailuresAfter,
  speechRetryable,
} from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import {
  speakWordJudgementOf,
  speakWordSessionResults,
  speakWordSkippedCount,
  speakWordSkippedIndexes,
  speakWordSkipRest,
} from "./speak-word";
import type {
  SpeakWordQuestion,
  SpeakWordSessionAction,
  SpeakWordSessionState,
} from "./speak-word.contract";
import type { SpeakWordHint } from "./speak-word-hint";

export type SpeakWordMicArgs = {
  readonly mic: MicPermissionContext | undefined;
  readonly questions: readonly SpeakWordQuestion[];
  readonly state: SpeakWordSessionState;
  readonly dispatch: (action: SpeakWordSessionAction) => void;
  readonly density: LearningDensity;
  readonly onItemAnswered: ItemAnswerReporter | undefined;
  readonly onFinish: ActivityFinish;
  readonly hint: SpeakWordHint;
};

export type SpeakWordMic = {
  readonly attempt: SpeechAttemptControl;
  readonly permission: MicPermission;
  /** 결과를 한 번만 올립니다 — 부모가 화면을 걷기 전의 두 번째 탭 · 늦게 온 건너뜀을 막습니다. */
  readonly finish: (heard: readonly (string | null)[]) => void;
  /** 같은 문항에서 두 번 실패해 「Hear it」이 서는가입니다(정답 소리가 있을 때만). */
  readonly hearIt: boolean;
};

export function useSpeakWordMic(args: SpeakWordMicArgs): SpeakWordMic {
  const latest = useRef(args);
  latest.current = args;
  const { state, dispatch } = args;
  const finished = useRef(false);
  const finish = (heard: readonly (string | null)[]): void => {
    if (finished.current) return;
    finished.current = true;
    const { questions, onFinish } = latest.current;
    onFinish(
      speakWordSessionResults(questions, heard),
      speakWordSkippedCount(heard),
      speakWordSkippedIndexes(heard),
    );
  };

  const { attempt, permission } = useMicSpeechAttempt(
    {
      surface: "speak-word",
      context: args.mic,
      checkOnOpen: true,
      onReopen: () => dispatch({ type: "reopen" }),
      // 남은 문항을 이 까닭으로 건너뜀 보고하고 결과를 한 번 올립니다(마지막 활동이어도 완료 카드 없이).
      onSkipSpeaking: (reason) => {
        const now = latest.current;
        const total = now.questions.length;
        for (let index = now.state.questionIndex; index < total; index += 1) {
          now.onItemAnswered?.({
            questionIndex: index,
            outcome: "skipped",
            density: now.density,
            skipReason: reason,
          });
        }
        finish(speakWordSkipRest(now.state, total));
      },
    },
    // 판정은 결말 콜백(배경 스레드)에서 잽니다 — 렌더는 담아 둔 값만 읽습니다(ADR-0201 개정 ⟨렌더 밖 판정⟩).
    (outcome) => {
      const now = latest.current;
      const question = now.questions[now.state.questionIndex];
      const judgement = question === undefined ? null : speakWordJudgementOf(question, outcome);
      dispatch({ type: "outcome", outcome, judgement });
    },
  );

  // 같은 문항에서 다시 말할 수 있는 실패가 몇 번 쌓였는가 — 문항이 바뀌면 처음부터 셉니다.
  const [failures, setFailures] = useState({ index: state.questionIndex, count: 0 });
  useEffect(() => {
    setFailures((previous) => ({
      index: state.questionIndex,
      count: speechFailuresAfter(
        previous.index === state.questionIndex ? previous.count : 0,
        state.phase,
      ),
    }));
  }, [state.questionIndex, state.phase]);

  const hearIt =
    failures.index === state.questionIndex &&
    failures.count >= hearAnswerAfterFailures &&
    speechRetryable(state.phase) &&
    args.hint.hint?.listenSource !== undefined;
  return { attempt, permission, hearIt, finish };
}

/** 두 번 실패한 뒤 안내 줄 아래 서는 「Hear it」 — 정답 소리를 한 번 냅니다(힌트 「정답 듣기」와 같은 기록). */
export function SpeakWordHearIt({
  shown,
  hint,
}: {
  readonly shown: boolean;
  readonly hint: SpeakWordHint;
}): ReactNode {
  const copy = useUiCopy();
  const source = hint.hint?.listenSource;
  if (!shown || source === undefined) return null;
  const listen = (): void => {
    "background only";
    playSound("button");
    hint.state.listen(source);
  };
  return (
    <view className="speak-word-activity-hear-it" data-testid="speak-word-hear-it">
      <Button
        label={copy.micPermission.hearIt}
        variant="outline"
        size="m"
        width="hug"
        bindtap={listen}
      />
    </view>
  );
}
