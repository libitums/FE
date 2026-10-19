import { useEffect, useMemo, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { AnswerReveal } from "../../components/AnswerReveal";
import { AnswerVerdict } from "../../components/AnswerVerdict";
import { SpeechWaves } from "../../components/SpeechWaves";
import { useSpeechAttempt } from "../../components/use-speech-attempt";
import { announce, announceCompletion } from "../../lib/accessibility";
import { playSound } from "../../lib/sound-effects";
import { speechControlLabel, speechWavesStateOf } from "../../lib/speech-attempt";
import type { SpeechControl } from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { LearningShell } from "../learning/LearningShell";
import {
  initialSpeakWordSessionState,
  isSpeakWordSessionComplete,
  speakWordCompletionAnnouncement,
  speakWordControlsOf,
  speakWordHintOf,
  speakWordInstructionOf,
  speakWordMeaningShown,
  speakWordResultAt,
  speakWordResultAnnouncement,
  speakWordRevealText,
  speakWordSessionReducer,
  speakWordSessionResults,
  speakWordSkippedCount,
} from "./speak-word";
import type { SpeakWordActivityProps } from "./speak-word.contract";
import { SpeakWordPicture } from "./SpeakWordPicture";
import { useSpeakWordPicture } from "./use-speak-word-picture";

import "./speak-word-activity.css";

// 그림을 보고 낱말을 말하는 활동입니다(카탈로그 SPEAK_WORD). 채점합니다 — 들은 글자의 앞 낱말이 정답과 같으면
// 정답이고, 판정 뒤 정답 상자가 맞아도 서며 2.5초 뒤 스스로 다음 문항으로 넘어갑니다. 뼈대는 `LearningShell`이
// 집니다. DOM 순서 = 낭독 순서입니다: 판정 → 그림 틀 → (뜻 줄 — 낭독 밖) → 정답 상자 → 마이크 → 안내 줄 → 버튼.
export function SpeakWordActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
}: SpeakWordActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(speakWordSessionReducer, initialSpeakWordSessionState);
  const finished = useRef(false);
  const attempt = useSpeechAttempt((outcome) => dispatch({ type: "outcome", outcome }));

  const complete = isSpeakWordSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const picture = useSpeakWordPicture(state.questionIndex, question?.meaning ?? null);
  const { phase } = state;
  const result = question == null ? null : speakWordResultAt(question, state);
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

  // 판정은 서는 순간, 불가 안내(또는 받아쓰기 지시문)도 서는 순간 한 번 알립니다. 듣는 중에는 알리지 않습니다 —
  // 마이크가 켜진 동안의 화면 낭독은 인식기에 그대로 들어갑니다.
  useEffect(() => {
    if (result !== null && question != null) {
      announce(speakWordResultAnnouncement(question, result, copy));
    } else if (phase.kind === "unavailable") {
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

  // 결과는 한 번만 올라갑니다 — 부모가 화면을 걷기 전의 두 번째 탭을 막습니다.
  const finish = (heard: readonly (string | null)[]): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish(speakWordSessionResults(questions, heard), speakWordSkippedCount(heard));
  };
  const handsOff = handsOffAfter(lesson, state.questionIndex, questions.length);

  const run = (control: SpeechControl): void => {
    switch (control) {
      case "speak":
      case "retry":
        dispatch({ type: "start" });
        attempt.start();
        return;
      case "stop":
        attempt.stop();
        return;
      case "skip":
        // 레슨 중간 활동의 마지막 문항이면 완료 카드 없이 곧바로 결과를 올립니다.
        if (handsOff) finish([...state.heard, null]);
        else dispatch({ type: "skip" });
        return;
      case "next":
        dispatch({ type: "next" });
        return;
    }
  };

  // 판정 뒤 스스로 넘어가는 걸음입니다. 관계없는 리렌더(그림 로드 등)가 기다림을 되돌리지 않게 참조를
  // 메모하고, 부르는 시점의 최신 값은 ref로 읽습니다.
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
    if (primary === "speak" || primary === "stop") {
      playSound("button");
      run(primary);
    }
  };

  const secondaryNode =
    secondary === null ? undefined : (
      <view
        className="speak-word-activity-secondary"
        data-testid="speak-word-secondary"
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
    );

  // 완료면 주 버튼이 결과를 올립니다. 그 밖에는 국면별 조작입니다.
  const action: { label: string; run: () => void } | undefined =
    question == null
      ? { label: copy.common.seeResults, run: () => finish(state.heard) }
      : primary === null
        ? undefined
        : { label: labelOf(primary), run: () => run(primary) };

  return (
    <LearningShell
      form="speak-word"
      gemCount={gemCount}
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
      scrollCard
      // 셸은 주 버튼이 있어야 버튼 행을 그립니다 — 그림 로딩 중에는 주 버튼이 없어 보조 `Skip`이 작업 영역에 섭니다.
      secondaryAction={action === undefined ? undefined : secondaryNode}
      workspace={
        question == null ? undefined : (
          <>
            <view className="speak-word-activity-hint-slot">
              {hint === null ? null : (
                <text className="speak-word-activity-hint" data-testid="speak-word-hint">
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
          data-reason={phase.kind === "unavailable" ? phase.reason : undefined}
        >
          {/* 판정 배지 자리 — 비어 있어도 자리를 지켜 카드 높이가 흔들리지 않습니다. */}
          <view className="speak-word-activity-verdict-slot">
            {result === null ? null : <AnswerVerdict result={result} />}
          </view>

          {question == null ? (
            <LearningActivityComplete
              questionCount={questions.length}
              lesson={lesson}
              testId="speak-word-complete"
            />
          ) : (
            <>
              <SpeakWordPicture
                url={question.pictureUrl}
                meaning={question.meaning}
                state={picture.state}
                onLoad={picture.onLoad}
                onError={picture.onError}
              />
              {/* 뜻 줄은 낭독에서 뺍니다 — 그림 틀 이름이 같은 뜻을 이미 읽습니다. 그림이 실패하면 틀 안
                  대체 글자가 같은 뜻을 크게 보이므로 그리지 않습니다. */}
              {speakWordMeaningShown(picture.state) ? (
                <text
                  className="speak-word-activity-meaning"
                  data-testid="speak-word-meaning"
                  accessibility-element={false}
                >
                  {question.meaning}
                </text>
              ) : null}
              {/* 맞아도 보입니다 — 발음을 한 번 더 확인합니다. */}
              {result === null ? null : (
                <AnswerReveal
                  testId="speak-word-reveal"
                  text={speakWordRevealText(question, copy)}
                />
              )}
              {/* 녹음 아이콘과 아래 주 버튼이 같은 시작 · 중지 동작을 제공합니다. 그림이 서기 전에는 꺼집니다. */}
              <SpeechWaves
                testId="speak-word-waves"
                state={picture.state === "loading" ? "off" : speechWavesStateOf(phase)}
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
