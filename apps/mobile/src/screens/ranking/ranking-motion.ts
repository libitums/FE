// 순위 화면의 모션(ADR-0170 D12, 시안 「랭킹 모션」 2026-11-22) — 줄 차례 등장 · 메달 등장 · 내 줄 강조 · 내 점수 숫자 오름.
// 모양은 `ranking-motion.css`. 움직임 줄이기면 클래스가 붙지 않고 점수는 곧바로 지금 값입니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs, useMotion } from "@libitums/ui-lynx/motion";

import { useCountUp } from "../../lib/use-count-up";

/** 차례 등장의 마지막 칸 — 그 뒤 줄은 같은 때 뜹니다(화면에 보이는 줄 수쯤). */
export const STAGGER_LAST = 7;
/** 줄이 다 뜨는 때(d1 칸 수) — 내 줄 강조와 숫자 오름이 여기서 시작합니다. `ranking-motion.css`의 지연과 같은 값. */
const AFTER_LIST_STEPS = 14;

export const useReducedMotion = (): boolean => useMotion() === "reduced";

/** 목록 줄 상자의 등장 클래스(앞에 빈칸) — 줄이기면 빈 글. */
export const itemInClass = (index: number, reduced: boolean): string =>
  reduced ? "" : ` ranking-in ranking-in-${Math.min(index, STAGGER_LAST)}`;

export const medalInClass = (rank: number, reduced: boolean): string =>
  reduced ? "" : ` ranking-medal-in ranking-medal-in-${rank}`;

export const pulseClass = (reduced: boolean): string => (reduced ? "" : " ranking-row-pulse");

/**
 * 내 점수 — 마지막으로 다 본 점수(`seen`)보다 올랐으면 줄이 다 뜬 뒤 거기서부터 셉니다. 그 밖에는 곧바로 지금 점수.
 * 지금 점수를 다 보여 준 때 `onShown`으로 알립니다(셀 것이 없으면 곧바로) — 세는 도중에 화면을 떠나면 알리지 않습니다.
 */
export function useRisingScore(score: number, seen: number | null, onShown?: () => void): number {
  const reduced = useReducedMotion();
  const rises = !reduced && seen !== null && seen < score;
  // 줄이 다 떠서 세기 시작했는가.
  const [armed, setArmed] = useState(false);
  const notify = useRef(onShown);
  notify.current = onShown;
  useEffect(() => {
    setArmed(false);
    if (!rises) return undefined;
    const timer = setTimeout(
      () => setArmed(true),
      motionDurationMs(motionTokens.duration.d1) * AFTER_LIST_STEPS,
    );
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      clearTimeout(timer);
    };
  }, [score, rises]);
  const counted = useCountUp(rises && !armed ? seen : score);
  const done = !rises || (armed && counted === score);
  useEffect(() => {
    if (done) notify.current?.();
  }, [done, score]);
  return rises ? counted : score;
}
