import { useEffect, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { ItemListenControls } from "../../components/ItemListenControls";
import { SpeechWaves } from "../../components/SpeechWaves";
import { useListenAudio } from "../../components/use-listen-audio";
import { useSpeechAttempt } from "../../components/use-speech-attempt";
import { announce } from "../../lib/accessibility";
import { stopAudio } from "../../lib/audio";
import { listenCueOf, standaloneLessonAudio } from "../../lib/question-audio";
import { initialSessionOptions } from "../../lib/session-options";
import { playSound } from "../../lib/sound-effects";
import { speechControlLabel, speechWavesStateOf } from "../../lib/speech-attempt";
import type { SpeechControl } from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import {
  initialReadAloudSessionState,
  readAloudControlsOf,
  readAloudHintOf,
  readAloudInstructionOf,
  readAloudMatchedCount,
  readAloudSessionReducer,
  readAloudStepOf,
} from "./read-aloud";
import type { ReadAloudActivityProps } from "./read-aloud.contract";
import { ReadAloudSentence } from "./ReadAloudSentence";

import "./read-aloud-activity.css";

// 글을 보고 소리 내어 읽는 활동입니다(카탈로그 SHADOW). 채점하지 않습니다 — 판정 배지 자리에 중립 표식
// `Practice`가 서고, 인식 뒤에는 앞에서부터 맞은 낱말만 칠하며 맞은 수를 한 줄로 알립니다. 완료 카드가
// 없습니다: 마지막 문항의 넘김 버튼이 빈 결과와 건너뜀 수를 한 번 올립니다.
// DOM 순서 = 낭독 순서입니다: 표식 → 문장 → 로마자 → 영어 → 마이크 → 안내 줄 → 버튼.
export function ReadAloudActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
  lessonAudio,
}: ReadAloudActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(readAloudSessionReducer, initialReadAloudSessionState);
  const finished = useRef(false);
  const attempt = useSpeechAttempt((outcome) => dispatch({ type: "outcome", outcome }));

  const index = Math.min(state.questionIndex, Math.max(0, questions.length - 1));
  const question = questions[index];
  const { phase } = state;
  const step = readAloudStepOf(lesson, index, questions.length);
  const counter = lessonCounter(lesson, index, questions.length);
  const controls = readAloudControlsOf(phase);
  const hint = question === undefined ? null : readAloudHintOf(question, phase, copy);
  const matched = question === undefined ? 0 : readAloudMatchedCount(question, phase);

  // 문장을 들려 주는 음성입니다 — 서면 지금 속도로 1회 자동 재생하고, 간이 줄에서 다시 듣기 · 「천천히」를 씁니다.
  // 말하기 시작 전에는 재생을 멈추고(마이크로 소리가 들어가지 않게), 녹음 중 줄을 누르면 녹음을 멈추고 재생합니다.
  const listen = useListenAudio(
    listenCueOf(String(index), question?.audio),
    lessonAudio ?? standaloneLessonAudio(initialSessionOptions),
  );
  const stopRecording = (): void => {
    "background only";
    if (phase.kind === "listening") attempt.stop();
  };
  const listenControl = {
    ...listen,
    replay: () => {
      "background only";
      stopRecording();
      listen.replay();
    },
    togglePace: () => {
      "background only";
      stopRecording();
      listen.togglePace();
    },
  };
  // 연습의 결말(들음)이 서는 순간 한 번 보고합니다 — 건너뜀은 아래 `advanceOrFinish`가 보고합니다.
  useEffect(() => {
    if (phase.kind === "heard") listen.answered("practiced");
    // 문항 순번 · 국면이 바뀔 때만 봅니다 — 보고는 문항당 한 번이라 훅이 거릅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, phase.kind]);

  // 인식 결과와 불가 안내(또는 받아쓰기 지시문)는 서는 순간 한 번 알립니다. 듣는 중에는 알리지 않습니다 —
  // 마이크가 켜진 동안의 화면 낭독은 인식기에 그대로 들어갑니다.
  useEffect(() => {
    const dictationOff = phase.kind === "unavailable" && phase.reason === "dictation-off";
    const content = dictationOff ? copy.speaking.dictationDisabled : hint;
    if (content !== null) {
      announce(content);
    }
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — 안내는 그 둘에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, phase]);

  // 마지막 문항(또는 레슨 중간 활동의 마지막)이면 걸음을 리듀서에 보내는 대신 결과를 한 번 올립니다.
  const leave = (skipped: number): void => {
    if (finished.current) {
      return;
    }
    finished.current = true;
    onFinish([], state.skippedCount + skipped);
  };
  const advanceOrFinish = (type: "next" | "skip"): void => {
    const skipped = type === "skip" ? 1 : 0;
    if (type === "skip") listen.answered("skipped");
    if (step === "advance") {
      dispatch({ type });
      return;
    }
    leave(skipped);
  };

  const labelOf = (control: SpeechControl): string =>
    speechControlLabel(
      control,
      step === "finish" ? copy.common.seeResults : copy.common.next,
      copy,
    );

  const run = (control: SpeechControl): void => {
    switch (control) {
      case "speak":
      case "retry":
        // 말하기 전에 소리를 멈춥니다 — 재생 소리가 마이크로 들어가지 않게 합니다.
        stopAudio();
        dispatch({ type: "start" });
        attempt.start();
        return;
      case "stop":
        attempt.stop();
        return;
      case "next":
        advanceOrFinish("next");
        return;
      case "skip":
        advanceOrFinish("skip");
        return;
    }
  };

  const { primary, secondary } = controls;

  // custom prop(`Button`의 `bindtap`)을 거쳐 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleSecondary = (): void => {
    "background only";
    if (secondary !== null) {
      playSound("button");
      run(secondary);
    }
  };
  const handleWaves = (): void => {
    "background only";
    if (primary === "speak" || primary === "stop") {
      playSound("button");
      run(primary);
    }
  };

  return (
    <LearningShell
      form="read-aloud"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={readAloudInstructionOf(phase, copy)}
      onExit={onExit}
      actionLabel={primary === null ? undefined : labelOf(primary)}
      onAction={primary === null ? undefined : () => run(primary)}
      scrollCard
      secondaryAction={
        secondary === null ? undefined : (
          <view
            className="read-aloud-activity-secondary"
            data-testid="read-aloud-secondary"
            data-control={secondary}
          >
            <Button
              label={labelOf(secondary)}
              variant="outline"
              size="xl"
              width="hug"
              bindtap={handleSecondary}
            />
          </view>
        )
      }
      workspace={
        <view className="read-aloud-activity-hint-slot">
          {hint === null ? null : (
            <text className="read-aloud-activity-hint" data-testid="read-aloud-hint">
              {hint}
            </text>
          )}
        </view>
      }
      card={
        <view
          className="read-aloud-activity-content"
          data-testid="read-aloud-content"
          data-questionindex={index}
          data-phase={phase.kind}
          data-reason={phase.kind === "unavailable" ? phase.reason : undefined}
        >
          {/* 판정 배지 자리에 서는 중립 표식입니다 — 채점하지 않는 연습임을 처음부터 끝까지 말합니다. */}
          <view className="read-aloud-activity-badge-slot">
            {question === undefined ? null : (
              <view className="read-aloud-activity-badge">
                <text className="read-aloud-activity-badge-text" data-testid="read-aloud-badge">
                  {copy.readAloud.badge}
                </text>
              </view>
            )}
          </view>

          {question === undefined ? null : (
            <>
              <ReadAloudSentence question={question} matchedCount={matched} copy={copy} />
              {question.audio === undefined ? null : (
                <ItemListenControls control={listenControl} testId="read-aloud-listen" />
              )}
              {/* 녹음 아이콘과 아래 주 버튼이 같은 시작 · 중지 동작을 제공합니다. */}
              <SpeechWaves
                testId="read-aloud-waves"
                state={speechWavesStateOf(phase)}
                label={primary === "stop" ? copy.speaking.stopSpeaking : copy.speaking.speak}
                onTap={handleWaves}
              />
            </>
          )}
        </view>
      }
    />
  );
}
