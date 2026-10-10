import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useMemo, useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { LearningItemGuide } from "../../components/LearningItemGuide";
import { useLearningItemGuide } from "../../components/use-learning-item-guide";
import { announce, announceCompletion } from "../../lib/accessibility";
import type { AnswerResult } from "../../lib/answer-result";
import {
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../../lib/speech-recognition";
import type { SpeechResult } from "../../lib/speech-recognition";
import { canListen } from "../../lib/speaking-judge";
import { playSound } from "../../lib/sound-effects";
import { SpeakingSentenceCard } from "./SpeakingSentenceCard";
import { LearningShell } from "../learning/LearningShell";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import type { JourneyStepId } from "../journey-map/journey-map";
import {
  initialSpeakingSessionState,
  isSpeakingSessionComplete,
  judgeSpeaking,
  matchedWordCount,
  speakingAnnouncement,
  speakingCompletionAnnouncement,
  speakingQuestionsForStep,
  speakingSessionReducer,
} from "./speaking";

import "./speaking-screen.css";

// 말하기 화면은 문항·판정·녹음 조작을 소유하고 배치는 LearningShell에 맡깁니다.
export type SpeakingScreenProps = {
  stepId: JourneyStepId;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[], skippedCount: number) => void;
};

export function SpeakingScreen({ stepId, onExit, onFinish }: SpeakingScreenProps): ReactNode {
  const copy = useUiCopy();
  const questions = speakingQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(speakingSessionReducer, initialSpeakingSessionState);
  const [dictationDisabled, setDictationDisabled] = useState(false);
  const firstQuestion = questions[0];
  const guide = useLearningItemGuide(
    firstQuestion === undefined
      ? null
      : { form: "speaking", optionalPractice: firstQuestion.optionalPractice },
  );

  // 화면이 떠 있는가입니다. 권한 조회 · 인식은 호스트를 거쳐 늦게 돌아오므로, 떠난 뒤에
  // 돌아온 콜백이 인식을 새로 시작하거나(마이크가 켜진 채 남습니다) 상태를 바꾸지 않게 막습니다.
  const mounted = useRef(true);

  const complete = isSpeakingSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  const judged = question != null && state.phase === "judged";
  const matched = judged ? matchedWordCount(question.sentence, state.recognized) : 0;
  const result = judged ? judgeSpeaking(question.sentence, state.recognized) : null;

  // 화면을 떠나면 듣던 것을 멈춥니다 — 마이크가 켜진 채 남지 않게 합니다.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeechRecognition();
    };
  }, []);
  useEffect(() => {
    if (result === null) {
      return;
    }
    announce(speakingAnnouncement(result, copy));
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `result`는 그 둘에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(speakingCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);
  const handleResult = (sentence: string) => (result: SpeechResult) => {
    if (!mounted.current) {
      return;
    }
    if (result.status !== "recognized") {
      setDictationDisabled(result.errorDomain === "kLSRErrorDomain" && result.errorCode === 201);
      dispatch({ type: "unavailable" });
      return;
    }
    dispatch({
      type: "recognized",
      text: result.text,
      result: judgeSpeaking(sentence, result.text),
    });
  };
  // 권한을 먼저 확인하고(미요청인 것만 묻습니다), 들을 수 있으면 인식을 시작합니다.
  const startListening = (sentence: string) => {
    if (guide.visible) return;
    setDictationDisabled(false);
    dispatch({ type: "start" });
    const requested = requestSpeechPermissions((status) => {
      if (!mounted.current) {
        return;
      }
      if (!canListen(status)) {
        dispatch({ type: "unavailable" });
        return;
      }
      if (startSpeechRecognition({}, handleResult(sentence)) === "unavailable") {
        dispatch({ type: "unavailable" });
      }
    });
    if (requested === "unavailable") {
      dispatch({ type: "unavailable" });
    }
  };

  const action =
    question == null
      ? {
          label: copy.common.seeResults,
          // 건너뛴 문항 수는 세션이 셉니다 — `results`에서 뽑을 수 없습니다(건너뛴
          // 문항이 `"correct"`로 실려 맞힌 문항과 구별되지 않습니다).
          run: () => onFinish(stepId, state.results, state.skippedCount),
        }
      : state.phase === "ready"
        ? { label: copy.speaking.speak, run: () => startListening(question.sentence) }
        : state.phase === "listening"
          ? { label: copy.speaking.stopSpeaking, run: () => stopSpeechRecognition() }
          : state.phase === "unavailable"
            ? {
                label: copy.common.skip,
                run: () =>
                  dispatch(
                    question.optionalPractice
                      ? { type: "skip", allowUnavailable: true }
                      : { type: "next" },
                  ),
              }
            : undefined;

  // custom prop(`Button`의 `bindtap`)을 거쳐 `bindtap`에 닿는 핸들러라 `'background only'`를
  // 둡니다 — 맵 항목 어댑터들과 같은 경계입니다.
  const handleSkip = () => {
    "background only";
    if (guide.visible) return;
    playSound("button");
    dispatch({ type: "skip" });
  };
  const retryAvailable = state.phase === "unavailable" && dictationDisabled;
  const handleRetry = () => {
    "background only";
    if (question != null && retryAvailable) {
      playSound("button");
      startListening(question.sentence);
    }
  };
  const advance = useMemo(
    () =>
      question != null && state.phase === "judged"
        ? { label: copy.common.continue, run: () => dispatch({ type: "next" }), delayMs: 2500 }
        : undefined,
    [question, state.phase, copy],
  );

  const recordingAction =
    state.phase === "ready" || state.phase === "listening" ? action : undefined;
  const handleRecording = () => {
    "background only";
    if (guide.visible) return;
    if (recordingAction !== undefined) playSound("button");
    recordingAction?.run();
  };

  return (
    <>
      <LearningShell
        form="speaking"
        obscured={guide.visible}
        actionSound={guide.visible ? "none" : "button"}
        questionIndex={question == null ? Math.max(0, questions.length - 1) : state.questionIndex}
        questionCount={questions.length}
        complete={complete}
        instruction={
          retryAvailable
            ? copy.speaking.dictationDisabled
            : (question?.support?.instruction ?? copy.speaking.instruction)
        }
        onExit={onExit}
        actionLabel={action?.label}
        onAction={action?.run}
        advance={advance}
        scrollCard={true}
        secondaryAction={
          question != null && (state.phase === "ready" || retryAvailable) ? (
            <view
              className="speaking-screen-skip"
              data-testid={retryAvailable ? "speaking-screen-retry" : "speaking-screen-skip"}
            >
              <Button
                label={retryAvailable ? copy.speaking.tryAgain : copy.common.skip}
                variant="outline"
                size="xl"
                width="hug"
                bindtap={retryAvailable ? handleRetry : handleSkip}
              />
            </view>
          ) : undefined
        }
        workspace={
          question == null ? undefined : (
            <>
              <view className="speaking-screen-hint-slot">
                {state.phase === "judged" ? (
                  <text className="speaking-screen-hint" data-testid="speaking-screen-hint">
                    {copy.speaking.tapToContinue}
                  </text>
                ) : state.phase === "unavailable" && !dictationDisabled ? (
                  <text className="speaking-screen-hint" data-testid="speaking-screen-unavailable">
                    {copy.speaking.recognitionUnavailable}
                  </text>
                ) : null}
              </view>
            </>
          )
        }
        card={
          <view className="speaking-screen-content" data-testid="speaking-screen-content">
            {/* 판정 배지 자리 — 비어 있어도 자리를 지켜 카드 높이가 흔들리지 않습니다. */}
            <view className="speaking-screen-verdict-slot">
              {result === null ? null : <AnswerVerdict result={result} />}
            </view>

            {question == null ? (
              <LearningActivityComplete
                questionCount={questions.length}
                testId="speaking-screen-complete"
              />
            ) : (
              <>
                <SpeakingSentenceCard
                  question={question}
                  judged={judged}
                  matched={matched}
                  listening={state.phase === "listening"}
                  recordingLabel={recordingAction?.label}
                  onRecording={recordingAction === undefined ? undefined : handleRecording}
                />
              </>
            )}
          </view>
        }
      />
      {guide.visible ? <LearningItemGuide kind={guide.kind} onDismiss={guide.dismiss} /> : null}
    </>
  );
}
