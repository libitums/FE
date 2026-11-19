// 프로필 시트 목소리 견본 재생 훅입니다(ADR-0164 앱 추가 2026-11-20). 상태 · 판정은 순수 `voice-sample.ts`, 재생은 말풍선 음성과
// 같은 호스트 접점 `lib/audio.ts`(ADR-0017 D3 · ADR-0146) — 배속 1.0(목소리를 그대로). 저절로 틀지 않고, 시트가 닫히면(언마운트)
// 멈추고, 다른 소리가 시작되면(`onAudioStarted`) idle로 돌아갑니다. 서버 호출 · 엽전이 없습니다(미리 만든 정적 파일).

import { useEffect, useRef, useState } from "@lynx-js/react";

import { onAudioStarted, pauseAudio, playAudio, resumeAudio, stopAudio } from "../../lib/audio";
import type { VoiceSampleEvent, VoiceSampleState } from "./voice-sample";
import { finishEventOf, holdsAudio, startedPlayback, voiceSampleStep } from "./voice-sample";

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
  const self = useRef(false); // 내 `playAudio`가 부른 알림은 밀려남이 아닙니다
  const startedAt = useRef(0);
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
        if (url === null) return run("unavailable");
        self.current = true;
        startedAt.current = Date.now();
        const outcome = playAudio(url, () => run(finishEventOf(Date.now() - startedAt.current)));
        self.current = false;
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

  // 다른 소리가 시작되면 견본은 이미 대체됐습니다 — 단추만 처음으로. 시트가 닫히면 쥔 견본을 멈춥니다.
  useEffect(() => {
    const off = onAudioStarted(() => {
      if (!self.current && holdsAudio(current.current)) run("interrupted");
    });
    return () => {
      off();
      if (holdsAudio(current.current)) stopAudio();
    };
  }, []);

  return {
    state,
    toggle: () => {
      "background only";
      run("tap");
    },
  };
}
