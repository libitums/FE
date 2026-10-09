import { useEffect, useMemo, useState } from "@lynx-js/react";

import { resolveReducedMotion } from "../motion/motion.contract";
import { useMotion } from "../motion/MotionProvider";

export type TypewriterOptions = {
  readonly text: string;
  /** Unicode code point 하나를 표시하는 간격입니다. 기본 35ms, 0이면 즉시 표시합니다. */
  readonly intervalMs?: number;
  /** 출력 전 대기 시간입니다. 알림음 등 대사 앞 구간에 사용합니다. */
  readonly delayMs?: number;
  readonly enabled?: boolean;
  /** 없으면 MotionProvider의 값을 따릅니다. */
  readonly reducedMotion?: boolean;
  /** 같은 문장이 연속으로 나와도 새 장면에서 다시 시작할 때 사용합니다. */
  readonly resetKey?: string | number;
};

export type TypewriterState = {
  readonly visibleText: string;
  /** VisualNovelDialog의 visibleCharacterCount와 같은 code point 단위입니다. */
  readonly visibleCharacterCount: number;
  readonly isComplete: boolean;
  /** 출력 중 탭 등 백그라운드 이벤트에서 호출합니다. */
  readonly finish: () => void;
};

/** 스타일과 진행 동작은 소비자가 정하고, 이 훅은 텍스트 출력만 관리합니다. */
export function useTypewriter({
  text,
  intervalMs = 35,
  delayMs = 0,
  enabled = true,
  reducedMotion,
  resetKey,
}: TypewriterOptions): TypewriterState {
  const reduced = resolveReducedMotion(reducedMotion, useMotion());
  const interval =
    Number.isFinite(intervalMs) && intervalMs >= 0
      ? intervalMs === 0
        ? 0
        : Math.max(1, Math.floor(intervalMs))
      : 35;
  const delay = Number.isFinite(delayMs) && delayMs >= 0 ? Math.round(delayMs) : 0;
  const instant = !enabled || reduced || interval === 0;
  const characters = useMemo(() => Array.from(text), [text]);
  const session = useMemo(
    () => ({ characters, interval, delay, instant, resetKey }),
    [characters, interval, delay, instant, resetKey],
  );
  const [progress, setProgress] = useState({ session, count: 0 });
  // 새 문장 렌더에서 이전 문장의 진행률이 한 프레임 노출되지 않게 합니다.
  const visibleCharacterCount = instant
    ? characters.length
    : progress.session === session
      ? progress.count
      : 0;
  const isComplete = visibleCharacterCount === characters.length;

  useEffect(() => {
    if (isComplete) return;
    let count = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      timer = setInterval(() => {
        count += 1;
        setProgress({ session, count });
        if (count === session.characters.length) clearInterval(timer);
      }, session.interval);
    };
    const pending = session.delay > 0 ? setTimeout(start, session.delay) : undefined;
    if (session.delay === 0) start();
    return () => {
      clearTimeout(pending);
      clearInterval(timer);
    };
  }, [session, isComplete]);

  const finish = () => {
    "background only";
    setProgress({ session, count: characters.length });
  };

  return {
    visibleText: characters.slice(0, visibleCharacterCount).join(""),
    visibleCharacterCount,
    isComplete,
    finish,
  };
}
