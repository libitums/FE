import { useEffect, useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useSpeechAttempt } from "../../components/use-speech-attempt";
import { announceCompletion } from "../../lib/accessibility";
import { playAudio, stopAudio } from "../../lib/audio";
import { speechItemReportOf } from "../../lib/item-answer";
import type { ItemAnswerOutcome } from "../../lib/item-answer";
import { answerEchoCueOf, standaloneLessonAudio } from "../../lib/question-audio";
import { initialSessionOptions } from "../../lib/session-options";
import type { SpokenGrade } from "../../lib/speaking-judge";
import { useAudioCue } from "../../lib/use-audio-cue";
import { playSound } from "../../lib/sound-effects";
import { speechControlLabel } from "../../lib/speech-attempt";
import type { SpeechControl } from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { LearningShell } from "../learning/LearningShell";
import { useLearningReview } from "../learning/learning-review";
import { useLearningDensity } from "../learning/use-learning-density";
import {
  initialSpeakWordSessionState,
  isSpeakWordSessionComplete,
  speakWordCompletionAnnouncement,
  speakWordControlsOf,
  speakWordHintOf,
  speakWordInstructionOf,
  speakWordJudgedControls,
  speakWordJudgementOf,
  speakWordMicStateOf,
  speakWordResultAt,
  speakWordSessionReducer,
  speakWordSessionResults,
  speakWordSkippedCount,
  speakWordSkippedIndexes,
} from "./speak-word";
import type { SpeakWordActivityProps } from "./speak-word.contract";
import { SpeakWordPicture } from "./SpeakWordPicture";
import { SpeakWordSecondary } from "./SpeakWordSecondary";
import { SpeakWordWorkspace } from "./SpeakWordWorkspace";
import * as Hint from "./speak-word-hint";
import { useSpeakWordFeedback } from "./use-speak-word-feedback";
import { useSpeakWordPicture } from "./use-speak-word-picture";

import "./speak-word-activity.css";

// 그림을 보고 낱말을 말하는 활동입니다(카탈로그 SPEAK_WORD). 발음 기준으로 채점하고(ADR-0201), 판정 뒤 결과 시트가 서며
// 저절로 넘어가지 않습니다 — Continue로 넘기고, 처음 오답이면 한 번 다시 말할 수 있습니다(시안 S1 ~ S4). 뼈대는
// `LearningShell`. DOM 순서 = 낭독 순서: 지시문 → 그림 → 마이크 또는 결과 시트 → 버튼.
export function SpeakWordActivity({
  questions,
  onExit,
  onFinish,
  lesson,
  lessonAudio,
  onItemAnswered,
}: SpeakWordActivityProps): ReactNode {
  const copy = useUiCopy();
  const density = useLearningDensity();
  const [state, dispatch] = useReducer(speakWordSessionReducer, initialSpeakWordSessionState);
  const finished = useRef(false);
  const complete = isSpeakWordSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  // 판정은 결말 콜백(배경 스레드)에서 잽니다 — 렌더는 담아 둔 값만 읽습니다(ADR-0201 개정 ⟨렌더 밖 판정⟩).
  const attempt = useSpeechAttempt((outcome) => {
    const judgement = question == null ? null : speakWordJudgementOf(question, outcome);
    dispatch({ type: "outcome", outcome, judgement });
  });
  const picture = useSpeakWordPicture(state.questionIndex, question?.meaning ?? null);
  const { phase, judgement } = state;
  // 멈춤을 누른 뒤 결말이 오기까지는 「Checking…」입니다. 국면이 바뀌면 풀립니다.
  const [stopping, setStopping] = useState(false);
  useEffect(() => setStopping(false), [phase]);
  const result = question == null ? null : speakWordResultAt(state);
  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );
  // 다시 도전(ADR-0058) 중에는 판 안 Continue가 다음 걸음입니다 — 다시 말하기는 두지 않습니다.
  const reviewing = useLearningReview() !== null;
  const controls =
    question == null
      ? { primary: null, secondary: null }
      : judgement !== null && phase.kind === "heard"
        ? speakWordJudgedControls(judgement, reviewing ? 1 : state.attempt)
        : speakWordControlsOf(phase, picture.state);
  const hint = question == null ? null : speakWordHintOf(phase, copy);
  const answerHint = Hint.useSpeakWordHint(question, state.questionIndex);
  const report = (outcome: ItemAnswerOutcome, grade?: SpokenGrade): void =>
    onItemAnswered?.({
      ...speechItemReportOf(state.questionIndex, outcome, density, phase),
      ...Hint.hintUsedOf(answerHint),
      ...(grade === undefined ? {} : { grade }),
    });

  // 판정이 난 국면(들음)에서 정답 음성을 1.0으로 한 번 들려 줍니다. 불가 · 건너뜀에서는 내지 않습니다.
  const autoPlay = (lessonAudio ?? standaloneLessonAudio(initialSessionOptions)).autoPlay;
  useAudioCue(
    answerEchoCueOf(
      `${String(state.questionIndex)}-${String(state.attempt)}`,
      question?.audio,
      phase.kind === "heard",
      autoPlay,
    ),
  );
  useSpeakWordFeedback({ question, state, copy, hint, report });
  useEffect(() => {
    if (!complete) return;
    announceCompletion(speakWordCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  // 결과는 한 번만 올라갑니다(부모가 걷기 전의 두 번째 탭을 막음).
  const finish = (heard: readonly (string | null)[]): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish(
      speakWordSessionResults(questions, heard),
      speakWordSkippedCount(heard),
      speakWordSkippedIndexes(heard),
    );
  };
  const handsOff = handsOffAfter(lesson, state.questionIndex, questions.length);

  const run = (control: SpeechControl): void => {
    switch (control) {
      case "speak":
      case "retry":
        // 말하기 전에 소리를 멈춥니다 — 정답 음성이 마이크로 들어가지 않게 합니다.
        stopAudio();
        dispatch({ type: "start" });
        attempt.start();
        return;
      case "stop":
        setStopping(true);
        attempt.stop();
        return;
      case "skip":
        report("skipped");
        // 레슨 중간 활동의 마지막 문항이면 완료 카드 없이 곧바로 결과를 올립니다.
        if (handsOff) finish([...state.heard, null]);
        else dispatch({ type: "skip" });
        return;
      case "next":
        stopAudio();
        if (handsOff) finish(state.heard);
        else dispatch({ type: "next" });
        return;
    }
  };

  const { primary, secondary } = controls;
  const judged = phase.kind === "heard";
  // 판정 뒤 주 버튼 `next`는 Continue, 보조 `next`는 Next입니다(시안 S2 ~ S4).
  const labelOf = (control: SpeechControl, main: boolean): string =>
    control === "next" && main && judged
      ? copy.common.continue
      : speechControlLabel(control, copy.common.next, copy);

  // custom prop(`Button`의 `bindtap`)을 거쳐 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleSecondary = (): void => {
    "background only";
    if (secondary !== null) {
      playSound("button");
      run(secondary);
    }
  };
  // 마이크는 주 버튼과 같은 시작 · 멈춤이고, 못 알아들은 뒤에는 같은 문항을 다시 듣습니다.
  const handleMic = (): void => {
    if (
      primary === "speak" ||
      primary === "stop" ||
      (primary === "retry" && phase.kind === "missed")
    ) {
      playSound("button");
      run(primary);
    }
  };
  const handleExpire = (): void => {
    if (phase.kind === "listening") run("stop");
  };
  const audioSource = question?.audio?.source;
  const handleHear =
    audioSource === undefined
      ? undefined
      : () => {
          playAudio(audioSource, () => {});
        };

  const secondaryNode =
    secondary === null ? undefined : (
      <SpeakWordSecondary
        control={secondary}
        label={labelOf(secondary, false)}
        onTap={handleSecondary}
      />
    );

  const action: { label: string; run: () => void } | undefined =
    question == null
      ? { label: copy.common.seeResults, run: () => finish(state.heard) }
      : primary === null
        ? undefined
        : { label: labelOf(primary, true), run: () => run(primary) };

  return (
    <>
      <LearningShell
        form="speak-word"
        questionIndex={counter.questionIndex}
        questionCount={counter.questionCount}
        complete={complete}
        instruction={
          question == null
            ? copy.speakWord.instruction
            : speakWordInstructionOf(question, phase, copy)
        }
        onExit={onExit}
        actionLabel={action?.label}
        onAction={action?.run}
        // 배지 대신 결과 시트가 판정을 말합니다(시안 S2 ~ S4). 셸은 다시 도전 판에만 이 값을 씁니다.
        result={result ?? undefined}
        scrollCard
        // 셸은 주 버튼이 있어야 버튼 행을 그립니다 — 그림 로딩 중에는 주 버튼이 없어 보조 `Skip`이 작업 영역에 섭니다.
        secondaryAction={action === undefined ? undefined : secondaryNode}
        workspace={
          question == null ? undefined : (
            <SpeakWordWorkspace
              question={question}
              phase={phase}
              judgement={judgement}
              micState={speakWordMicStateOf(phase, picture.state, stopping)}
              onMic={handleMic}
              onExpire={handleExpire}
              onHear={handleHear}
              hint={hint}
              secondary={action === undefined ? secondaryNode : undefined}
            />
          )
        }
        card={
          <view
            className="speak-word-activity-content"
            data-testid="speak-word-content"
            data-questionindex={state.questionIndex}
            data-phase={phase.kind}
            data-reason={
              phase.kind === "unavailable" || phase.kind === "missed" ? phase.reason : undefined
            }
          >
            {question == null ? (
              <LearningActivityComplete
                questionCount={questions.length}
                lesson={lesson}
                testId="speak-word-complete"
              />
            ) : (
              <>
                <Hint.SpeakWordHintButton hint={answerHint} phase={phase} />
                <SpeakWordPicture
                  url={question.pictureUrl}
                  ratio={density === "compact" ? "4-3" : "5-4"}
                  meaning={question.meaning}
                  state={picture.state}
                  onLoad={picture.onLoad}
                  onError={picture.onError}
                />
                {/* 판정 전 정답 로마자는 「Hint → 정답 보기」로만 섭니다(사용자 결정 2026-11-23). 판정이 나면 결과 시트의
                  정답 상자가 대신합니다. */}
                <Hint.SpeakWordHintLine hint={answerHint} judged={result !== null} />
              </>
            )}
          </view>
        }
      />
      <Hint.SpeakWordHintSheet hint={answerHint} />
    </>
  );
}
