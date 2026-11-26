import { useEffect, useMemo, useReducer, useRef } from "@lynx-js/react";
import { speechItemReportOf } from "../../lib/item-answer";
import type { ReactNode } from "@lynx-js/react";

import { AnswerReveal } from "../../components/AnswerReveal";
import { SpeechWaves } from "../../components/SpeechWaves";
import { useSpeechAttempt } from "../../components/use-speech-attempt";
import { announce, announceCompletion } from "../../lib/accessibility";
import { stopAudio } from "../../lib/audio";
import { answerEchoCueOf, standaloneLessonAudio } from "../../lib/question-audio";
import { initialSessionOptions } from "../../lib/session-options";
import { useAudioCue } from "../../lib/use-audio-cue";
import { playSound } from "../../lib/sound-effects";
import { speechControlLabel, speechWavesStateOf } from "../../lib/speech-attempt";
import type { SpeechControl } from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { LearningShell } from "../learning/LearningShell";
import { useLearningDensity } from "../learning/use-learning-density";
import {
  initialSpeakWordSessionState,
  isSpeakWordSessionComplete,
  speakWordCompletionAnnouncement,
  speakWordControlsOf,
  speakWordHintOf,
  speakWordInstructionOf,
  speakWordJudgementOf,
  speakWordResultAt,
  speakWordResultAnnouncement,
  speakWordRevealText,
  speakWordSessionReducer,
  speakWordSessionResults,
  speakWordSkippedCount,
  speakWordSkippedIndexes,
} from "./speak-word";
import type { SpeakWordActivityProps } from "./speak-word.contract";
import { SpeakWordPicture } from "./SpeakWordPicture";
import { SpeakWordSecondary } from "./SpeakWordSecondary";
import { revealSpeakWordHint, speakWordHintId } from "./speak-word-hint-scroll";
import * as Hint from "./speak-word-hint";
import { useSpeakWordPicture } from "./use-speak-word-picture";

import "./speak-word-activity.css";

// 그림을 보고 낱말을 말하는 활동입니다(카탈로그 SPEAK_WORD). 발음 기준으로 채점하고(ADR-0201), 판정 뒤 정답 상자가
// 서며 2.5초 뒤 다음 문항으로 넘어갑니다. 뼈대는 `LearningShell`. DOM 순서 = 낭독 순서: 판정 → 그림 → 정답 → 마이크 → 버튼.
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
  const { phase } = state;
  const result = question == null ? null : speakWordResultAt(state);
  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );
  const controls =
    question == null
      ? { primary: null, secondary: null }
      : speakWordControlsOf(phase, picture.state);
  const hint = question == null ? null : speakWordHintOf(phase, copy);
  const dictationOff = phase.kind === "unavailable" && phase.reason === "dictation-off";
  const answerHint = Hint.useSpeakWordHint(question, state.questionIndex);
  const report = (outcome: Parameters<typeof speechItemReportOf>[1]): void =>
    onItemAnswered?.({
      ...speechItemReportOf(state.questionIndex, outcome, density, phase),
      ...Hint.hintUsedOf(answerHint),
    });

  // 판정이 난 국면(들음)에서 정답 음성을 1.0으로 한 번 들려 줍니다. 불가 · 건너뜀에서는 내지 않습니다.
  const autoPlay = (lessonAudio ?? standaloneLessonAudio(initialSessionOptions)).autoPlay;
  useAudioCue(
    answerEchoCueOf(String(state.questionIndex), question?.audio, phase.kind === "heard", autoPlay),
  );

  // 판정 · 불가 안내는 서는 순간 한 번 알립니다. 듣는 중에는 알리지 않습니다(낭독이 인식기에 들어갑니다).
  useEffect(() => {
    if (result !== null && question != null) {
      report(result);
      announce(speakWordResultAnnouncement(question, result, copy));
    } else if (phase.kind === "unavailable" || phase.kind === "missed") {
      const content = dictationOff ? copy.speaking.dictationDisabled : hint;
      if (content !== null) announce(content);
    }
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — 안내는 그 둘에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, phase]);
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
        attempt.stop();
        return;
      case "skip":
        report("skipped");
        // 레슨 중간 활동의 마지막 문항이면 완료 카드 없이 곧바로 결과를 올립니다.
        if (handsOff) finish([...state.heard, null]);
        else dispatch({ type: "skip" });
        return;
      case "next":
        dispatch({ type: "next" });
        return;
    }
  };

  // 판정 뒤 스스로 넘어가는 걸음 — 리렌더가 기다림을 되돌리지 않게 메모하고, 최신 값은 ref로 읽습니다.
  const latest = useRef({ run, finish, handsOff, heard: state.heard });
  latest.current = { run, finish, handsOff, heard: state.heard };
  const advance = useMemo(
    () =>
      question != null && phase.kind === "heard"
        ? {
            label: copy.common.continue,
            delayMs: 2500,
            run: () => {
              const now = latest.current;
              if (now.handsOff) now.finish(now.heard);
              else now.run("next");
            },
          }
        : undefined,
    [question, phase, copy],
  );

  const { primary, secondary } = controls;
  const labelOf = (control: SpeechControl): string =>
    speechControlLabel(control, copy.common.next, copy);

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
    // 못 알아들은 뒤에는 마이크도 같은 문항을 다시 듣습니다(주 버튼 Try again과 같은 동작).
    if (
      primary === "speak" ||
      primary === "stop" ||
      (primary === "retry" && phase.kind === "missed")
    ) {
      playSound("button");
      run(primary);
    }
  };

  const secondaryNode =
    secondary === null ? undefined : (
      <SpeakWordSecondary control={secondary} label={labelOf(secondary)} onTap={handleSecondary} />
    );

  const action: { label: string; run: () => void } | undefined =
    question == null
      ? { label: copy.common.seeResults, run: () => finish(state.heard) }
      : primary === null
        ? undefined
        : { label: labelOf(primary), run: () => run(primary) };

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
        advance={advance}
        verdict={result ?? undefined}
        scrollCard
        // 셸은 주 버튼이 있어야 버튼 행을 그립니다 — 그림 로딩 중에는 주 버튼이 없어 보조 `Skip`이 작업 영역에 섭니다.
        secondaryAction={action === undefined ? undefined : secondaryNode}
        workspace={
          question == null ? undefined : (
            <>
              {/* 파형은 카드 밖입니다 — 카드와 아래 버튼 사이 남는 자리에 서고 칸 하한이 56입니다. 녹음 아이콘과 아래 주
                버튼이 같은 시작 · 중지 동작을 제공하며, 그림이 서기 전에는 꺼집니다. */}
              <view className="speak-word-activity-waves-slot">
                <SpeechWaves
                  testId="speak-word-waves"
                  state={picture.state === "loading" ? "off" : speechWavesStateOf(phase)}
                  label={primary === "stop" ? copy.speaking.stopSpeaking : copy.speaking.speak}
                  onTap={handleWaves}
                />
              </view>
              <view className="speak-word-activity-hint-slot">
                {hint === null ? null : (
                  <text
                    id={speakWordHintId}
                    className="speak-word-activity-hint"
                    data-testid="speak-word-hint"
                    bindlayoutchange={
                      phase.kind === "unavailable" || phase.kind === "missed"
                        ? revealSpeakWordHint
                        : undefined
                    }
                  >
                    {hint}
                  </text>
                )}
              </view>
              {action === undefined ? secondaryNode : null}
            </>
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
                {/* 판정 전 정답 로마자는 「Hint → 정답 보기」로만 섭니다(사용자 결정 2026-11-23, ADR-0084 적용 기록). 판정이
                  나면 정답 상자(낱말 · 로마자)가 섭니다(맞아도 보입니다 — 발음을 한 번 더 확인합니다). */}
                <Hint.SpeakWordHintLine hint={answerHint} judged={result !== null} />
                {result === null ? null : (
                  <AnswerReveal
                    testId="speak-word-reveal"
                    text={speakWordRevealText(question, copy)}
                  />
                )}
              </>
            )}
          </view>
        }
      />
      <Hint.SpeakWordHintSheet hint={answerHint} />
    </>
  );
}
