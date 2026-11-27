// 듣는 동안의 음량 · 남은 시간입니다. 듣는 중일 때만 호스트 상태를 짧은 간격으로 읽습니다. 시계는 호스트가 실제로 듣기
// 시작한 뒤(`listening`)부터 갑니다 — 권한 창이 떠 있는 동안에는 줄지 않습니다. 최대 시간이 지나면 한 번 `onExpire`.
// 움직임 줄이기면 음량 · 링을 그리지 않고(막대 · 링이 멈춤) 만료 시계만 둡니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { getSpeechStatus } from "../../lib/speech-recognition";
import {
  SPEECH_MIC_MAX_MS,
  SPEECH_MIC_POLL_MS,
  speechMeterOf,
  speechMicRemaining,
} from "./speech-mic";

export type SpeechMeter = { readonly meter: number; readonly remaining: number };

export function useSpeechMeter(
  active: boolean,
  reduced: boolean,
  onExpire: (() => void) | undefined,
): SpeechMeter {
  const [meter, setMeter] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    setMeter(0);
    setElapsed(0);
    if (!active) return undefined;
    let startedAt: number | null = null;
    let expired = false;
    const poll = setInterval(() => {
      if (startedAt !== null) {
        const now = Date.now() - startedAt;
        if (!reduced) setElapsed(now);
        if (!expired && now >= SPEECH_MIC_MAX_MS) {
          expired = true;
          expire.current?.();
        }
      }
      getSpeechStatus((status) => {
        if (status.listening && startedAt === null) startedAt = Date.now();
        if (!reduced) setMeter(speechMeterOf(status.level, status.levelDb ?? null));
      });
    }, SPEECH_MIC_POLL_MS);
    return () => clearInterval(poll);
  }, [active, reduced]);

  return { meter, remaining: reduced ? 1 : speechMicRemaining(elapsed) };
}
