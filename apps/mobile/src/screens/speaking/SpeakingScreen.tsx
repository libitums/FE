import { useEffect, useMemo, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import audioWaves from "@libitums/icons/lynx/audio-waves";
import { color } from "@libitums/design-tokens";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { announce, announceCompletion } from "../../lib/accessibility";
import type { AnswerResult } from "../../lib/answer-result";
import {
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../../lib/speech-recognition";
import type { SpeechResult } from "../../lib/speech-recognition";
import { canListen } from "../../lib/speaking-judge";
import { LearningShell } from "../learning/LearningShell";
import type { JourneyStepId } from "../journey-map/journey-map";
import {
  initialSpeakingSessionState,
  isSpeakingSessionComplete,
  judgeSpeaking,
  matchedWordCount,
  speakingAnnouncement,
  speakingCompletionAnnouncement,
  speakingCompletionText,
  speakingFinishLabel,
  speakingQuestionsForStep,
  speakingSessionReducer,
  speakingWords,
} from "./speaking";

import "./speaking-screen.css";

// 말하기(Figma 65-282)입니다. 뼈대는 `LearningShell`이 집니다 — 이 화면이 아는 것은 카드
// 안(판정 배지 · 따라 말할 문장 · 발음 표기 · 파형)과 아래 버튼이 지금 무엇을 하는가입니다.
//
// 인식은 호스트의 `SpeechRecognitionModule`이 합니다. 결과는 말하기를 멈출 때 한 번
// 오고, 그 결과로 앞에서부터 맞은 낱말을 칠하고 판정합니다. 모듈이 없거나(Explorer ·
// 테스트) 권한이 없으면 판정하지 않고 건너뛸 수 있게 합니다 — 기기 탓을 오답으로 접지
// 않습니다.
export type SpeakingScreenProps = {
  stepId: JourneyStepId;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[], skippedCount: number) => void;
};

export function SpeakingScreen({ stepId, onExit, onFinish }: SpeakingScreenProps): ReactNode {
  const questions = speakingQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(speakingSessionReducer, initialSpeakingSessionState);

  // 화면이 떠 있는가입니다. 권한 조회 · 인식은 호스트를 거쳐 늦게 돌아오므로, 떠난 뒤에
  // 돌아온 콜백이 인식을 새로 시작하거나(마이크가 켜진 채 남습니다) 상태를 바꾸지 않게 막습니다.
  const mounted = useRef(true);

  const complete = isSpeakingSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const words = useMemo(
    () => (question == null ? [] : speakingWords(question.sentence)),
    [question],
  );

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
    announce(speakingAnnouncement(result));
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `result`는 그 둘에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(speakingCompletionAnnouncement(speakingFinishLabel));
  }, [complete]);

  const handleResult = (sentence: string) => (result: SpeechResult) => {
    if (!mounted.current) {
      return;
    }
    if (result.status !== "recognized") {
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

  // 아래 버튼 — 준비 `말하기` · 듣는 중 `그만 말하기` · 인식 불가 `건너뛰기` · 완료 `결과
  // 보기`. 판정 뒤에는 버튼 대신 스스로 넘어가는 걸음(`advance`)이 섭니다 — 듣기와 같습니다.
  const action =
    question == null
      ? {
          label: speakingFinishLabel,
          // 건너뛴 문항 수입니다. `speakingSessionReducer`의 `skip` 갈래가 아직 자리
          // 표시자라 오늘은 늘 0입니다 — `logic` 변형이 실제 값을 세면 이 자리도 함께
          // 바뀝니다(logic-scaffold).
          run: () => onFinish(stepId, state.results, 0),
        }
      : state.phase === "ready"
        ? { label: "말하기", run: () => startListening(question.sentence) }
        : state.phase === "listening"
          ? { label: "그만 말하기", run: () => stopSpeechRecognition() }
          : state.phase === "unavailable"
            ? { label: "건너뛰기", run: () => dispatch({ type: "next" }) }
            : undefined;

  const advance = useMemo(
    () =>
      question != null && state.phase === "judged"
        ? { label: "다음으로", run: () => dispatch({ type: "next" }), delayMs: 2500 }
        : undefined,
    [question, state.phase],
  );

  return (
    <LearningShell
      form="speaking"
      questionIndex={question == null ? Math.max(0, questions.length - 1) : state.questionIndex}
      questionCount={questions.length}
      instruction="문장을 소리 내어 읽어 보세요."
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      advance={advance}
      workspace={
        question == null ? undefined : (
          <view className="speaking-screen-hint-slot">
            {state.phase === "judged" ? (
              <text className="speaking-screen-hint" data-testid="speaking-screen-hint">
                화면을 누르면 다음으로 넘어가요
              </text>
            ) : state.phase === "unavailable" ? (
              <text className="speaking-screen-hint" data-testid="speaking-screen-unavailable">
                지금은 음성 인식을 쓸 수 없어요. 건너뛰고 다음 문장으로 가요.
              </text>
            ) : null}
          </view>
        )
      }
      card={
        <view className="speaking-screen-content" data-testid="speaking-screen-content">
          {/* 판정 배지 자리 — 비어 있어도 자리를 지켜 카드 높이가 흔들리지 않습니다. */}
          <view className="speaking-screen-verdict-slot">
            {result === null ? null : <AnswerVerdict result={result} />}
          </view>

          {question == null ? (
            <text className="speaking-screen-complete" data-testid="speaking-screen-complete">
              {speakingCompletionText}
            </text>
          ) : (
            <>
              {/* 따라 말할 문장 — 판정 뒤에는 앞에서부터 맞게 말한 낱말이 주황으로, 나머지가
                  흐린 회색으로 갈립니다. 판정 전에는 한 색입니다. 낭독 이름은 문장 그대로입니다
                  — 색은 보이는 채널이고, 판정은 배지와 채점 발화가 소리로 싣습니다. */}
              <text
                className={`speaking-screen-sentence speaking-screen-sentence-${judged ? "judged" : "plain"}`}
                data-testid="speaking-screen-sentence"
                data-matched={String(matched)}
                accessibility-label={question.sentence}
              >
                {words.map((word, index) => (
                  <text
                    key={index}
                    className={
                      judged && index < matched
                        ? "speaking-screen-word speaking-screen-word-matched"
                        : "speaking-screen-word"
                    }
                  >
                    {index === 0 ? word : ` ${word}`}
                  </text>
                ))}
              </text>
              <text
                className="speaking-screen-romanization"
                data-testid="speaking-screen-romanization"
              >
                {question.romanization}
              </text>

              {/* 파형 — 듣는 중에는 주색, 아니면 흐린 회색입니다. 듣는 중인지는 이 요소의
                  이름이 소리로 싣습니다. */}
              <view
                className="speaking-screen-waves"
                data-testid="speaking-screen-waves"
                data-listening={state.phase === "listening" ? "true" : "false"}
                accessibility-element={state.phase === "listening"}
                accessibility-label="듣는 중"
              >
                <svg
                  className="speaking-screen-waves-icon"
                  content={audioWaves}
                  current-color={
                    state.phase === "listening" ? color.brand.primary : color.gray[300]
                  }
                />
              </view>
            </>
          )}
        </view>
      }
    />
  );
}
