// 목소리 견본 재생 훅입니다(ADR-0162 2026-11-19 추가). 상태 · 판정은 순수 `voice-sample.ts`, 재생은 말풍선 음성과 같은 호스트 접점
// `lib/audio.ts`(ADR-0017 D3 · ADR-0146) — 정적 주소를 그대로 받으므로 접점을 넓히지 않았습니다. 배속은 1.0(견본은 목소리를 그대로
// 들려 줍니다). 시트가 닫히면(언마운트) 멈춥니다. 서버 호출 · 엽전이 없습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { pauseAudio, playAudio, resumeAudio, stopAudio } from "../../lib/audio";
import type { VoiceSampleEvent, VoiceSampleState } from "./voice-sample";
import { holdsAudio, startedPlayback, voiceSampleStep } from "./voice-sample";

export type VoiceSample = {
  readonly state: VoiceSampleState;
  readonly toggle: () => void;
};

export function useVoiceSample(
  url: string | null,
  onPlayed: (() => void) | undefined,
): VoiceSample {
  const [state, setState] = useState<VoiceSampleState>("idle");
  const current = useRef<VoiceSampleState>("idle");
  const playedRef = useRef(onPlayed);
  playedRef.current = onPlayed;

  const run = (event: VoiceSampleEvent): void => {
    "background only";
    const before = current.current;
    const step = voiceSampleStep(before, event);
    current.current = step.state;
    setState(step.state);
    if (startedPlayback(before, step.state)) playedRef.current?.();
    switch (step.effect) {
      case "play": {
        const outcome = url === null ? "unavailable" : playAudio(url, () => run("finished"));
        return run(outcome === "started" ? "started" : "unavailable");
      }
      case "pause":
        return pauseAudio();
      case "resume":
        return resumeAudio();
      case "stop":
        return stopAudio();
      default:
        return undefined;
    }
  };

  // 시트가 닫히면 재생 중 · 멈춰 둔 견본을 멈춥니다(다른 화면으로 소리가 새지 않게).
  useEffect(
    () => () => {
      if (holdsAudio(current.current)) stopAudio();
    },
    [],
  );

  return {
    state,
    toggle: () => {
      "background only";
      run("tap");
    },
  };
}
