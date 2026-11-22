// 숫자 오름(ADR-0163 D3) — 값이 오르면 옛 값에서 새 값까지 짧게 셉니다(600ms, 50ms 칸 · 감속). 내려가거나 움직임 줄이기면 곧바로 새 값.
// 칸 일정은 순수 함수(`countUpFrames`)가 내고, 타이머는 한 번에 하나만 걸려 있다가 마지막 칸에서 끝납니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs, useMotion } from "@libitums/ui-lynx/motion";

import { countUpFrames } from "./purchase-wait";

export function useCountUp(value: number): number {
  const reduced = useMotion() === "reduced";
  const [shown, setShown] = useState(value);
  // 앞 값 — 효과가 돌 때 어디서부터 셀지 봅니다.
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    // oxlint-disable-next-line react/immutability
    from.current = value;
    if (reduced || value <= start) {
      setShown(value);
      return undefined;
    }
    const stepMs = motionDurationMs(motionTokens.duration.d1);
    const frames = countUpFrames(
      start,
      value,
      Math.round(motionDurationMs(motionTokens.duration.d8) / stepMs),
    );
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const step = (): void => {
      index += 1;
      setShown(frames[index] ?? value);
      timer = index < frames.length - 1 ? setTimeout(step, stepMs) : null;
    };
    timer = setTimeout(step, stepMs);
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [value, reduced]);

  // 줄이기 · 내려감은 이 렌더에서 곧바로 새 값입니다(효과가 따라잡기 전 한 칸도 옛 값이 비치지 않게).
  return reduced || shown > value ? value : shown;
}
