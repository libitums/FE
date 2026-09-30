import { useEffect, useState } from "@lynx-js/react";
import type { PrologueCall } from "./episode-intro.contract";
import { prologueCallProgress, prologueLineSeconds } from "./prologue-call";
import { pauseAudio, playAudio, resumeAudio, stopAudio } from "../../lib/audio";

/** 서사 전화의 재생과 대사 진행을 같은 수명주기로 관리합니다. */
export function usePrologueCallPlayback(call: PrologueCall) {
  // 완료한 대사 수입니다. 통화 시계는 CallCaller가 따로 셉니다.
  const [lineTicks, setLineTicks] = useState(0);
  const [paused, setPaused] = useState(false);
  const [nativePlayback, setNativePlayback] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  // 사용자가 끊었는지만 별도로 기록하고, 자연 종료는 완료한 대사 수에서 구합니다.
  const [hungUp, setHungUp] = useState(false);

  const progress = prologueCallProgress(lineTicks * prologueLineSeconds, call.lines.length);
  const ended = hungUp || progress.ended;
  const line = call.lines[progress.lineIndex];

  const audioSource = line?.audioSource;

  useEffect(() => {
    if (ended) return undefined;
    let active = true;
    setPaused(false);
    const outcome =
      audioSource === undefined
        ? "unavailable"
        : playAudio(audioSource, () => {
            if (active) setLineTicks((ticks) => ticks + 1);
          });
    setNativePlayback(outcome === "started");
    return () => {
      active = false;
      if (outcome === "started") stopAudio();
    };
  }, [ended, audioSource, progress.lineIndex, replayKey]);

  // 음원이 없거나 네이티브 모듈이 없는 미리보기에서도 읽기 흐름을 유지합니다.
  useEffect(() => {
    if (ended || nativePlayback || paused) return undefined;
    const timer = setInterval(() => setLineTicks((ticks) => ticks + 1), prologueLineSeconds * 1000);
    return () => clearInterval(timer);
  }, [ended, nativePlayback, paused, replayKey]);

  const togglePlayback = () => {
    "background only";
    if (paused) resumeAudio();
    else pauseAudio();
    setPaused((current) => !current);
  };

  const replay = () => {
    "background only";
    setPaused(false);
    setReplayKey((current) => current + 1);
  };

  const stop = () => {
    "background only";
    if (audioSource !== undefined) stopAudio();
  };
  const hangUp = () => {
    "background only";
    stop();
    setHungUp(true);
  };
  return { ended, line, paused, audioSource, togglePlayback, replay, hangUp, stop };
}
