// 최종 테스트 두 화면(장면 · 통화)이 함께 쓰는 말하기 결선입니다 — 호스트 음성 인식을 켜고
// 끄는 일, 주 버튼이 지금 무엇을 하는지, 판정 뒤 저절로 넘어가는 타이머입니다.

import { useEffect, useRef } from "@lynx-js/react";
import type { Dispatch } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { canListen, judgeSpeaking } from "../../lib/speaking-judge";
import {
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../../lib/speech-recognition";
import type { SpeechResult } from "../../lib/speech-recognition";
import {
  episodeFinalAdvanceDelayMs,
  type EpisodeFinalPhase,
  type EpisodeFinalSessionAction,
} from "./episode-final";

export type FinalSpeakingAction = { readonly label: string; readonly run: () => void };

/**
 * 호스트 음성 인식 결선입니다. 화면이 떠 있는가를 들고 있습니다 — 권한 조회 · 인식은 호스트를
 * 거쳐 늦게 돌아오므로, 떠난 뒤에 돌아온 콜백이 인식을 새로 시작하거나 상태를 바꾸지 않게
 * 막습니다. 화면을 떠나면 듣던 것을 멈춥니다(마이크가 켜진 채 남지 않게).
 */
export function useFinalSpeech(dispatch: Dispatch<EpisodeFinalSessionAction>) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeechRecognition();
    };
  }, []);

  const handleResult = (sentence: string) => (speech: SpeechResult) => {
    if (!mounted.current) {
      return;
    }
    if (speech.status !== "recognized") {
      dispatch({ type: "unavailable" });
      return;
    }
    dispatch({
      type: "recognized",
      text: speech.text,
      result: judgeSpeaking(sentence, speech.text),
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

  /**
   * 말하기의 주 버튼입니다 — 준비 `Speak` · 듣는 중 `Stop` · 인식 불가 `Skip`. 판정 뒤에는
   * 없습니다 — 저절로 넘어갑니다. 문구는 이 화면들의 다른 조작(`Say` · 서사의 `Next`)과 같이
   * 영어입니다(2026-09-28 결정).
   */
  const speakingAction = (
    phase: EpisodeFinalPhase,
    sentence: string,
    onSkip: () => void,
  ): FinalSpeakingAction | undefined =>
    phase === "ready"
      ? { label: "Speak", run: () => startListening(sentence) }
      : phase === "listening"
        ? { label: "Stop", run: () => stopSpeechRecognition() }
        : phase === "unavailable"
          ? { label: "Skip", run: onSkip }
          : undefined;

  return { speakingAction };
}

/**
 * 렌더마다 최신 값을 담는 ref입니다. 타이머가 걸린 뒤 부모가 다시 그려져 콜백(`onFinish` 등)이
 * 바뀌어도, 타이머는 앞 렌더의 콜백이 아니라 지금 콜백을 부릅니다(#143 리뷰).
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * 판정 뒤 잠시 뒤에 `onAdvance`를 부릅니다. 차례 · 국면이 바뀔 때만 겁니다. 부르는 함수는
 * ref가 늘 최신으로 듭니다. 화면을 떠나면 타이머를 걷습니다.
 */
export function useAdvanceAfterJudged(
  questionIndex: number,
  phase: EpisodeFinalPhase,
  onAdvance: () => void,
): void {
  const latest = useLatest(onAdvance);
  useEffect(() => {
    if (phase !== "judged") {
      return undefined;
    }
    const timer = setTimeout(() => latest.current(), episodeFinalAdvanceDelayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, phase]);
}

/** 판정이 서면 채점 결과를 한 번 읽습니다. 차례 · 국면이 바뀔 때만 냅니다. */
export function useAnnounceResult(
  questionIndex: number,
  phase: EpisodeFinalPhase,
  result: AnswerResult | null,
): void {
  useEffect(() => {
    if (result !== null) {
      announce(`채점 결과, ${answerResultLabel(result)}`);
    }
    // `result`는 차례 · 국면에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, phase]);
}
