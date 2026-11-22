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
 * 내 점수 — 지난번에 본 점수(`seen`)보다 올랐으면 줄이 다 뜬 뒤 거기서부터 셉니다. 그 밖에는 곧바로 지금 점수.
 * 다 세면 `onCounted`로 한 번 알립니다 — 세는 도중에 화면을 떠나면 알리지 않아 다음에 다시 셉니다.
 */
export function useRisingScore(score: number, seen: number | null, onCounted?: () => void): number {
  const reduced = useReducedMotion();
  const rises = !reduced && seen !== null && seen < score;
  const [value, setValue] = useState(rises ? seen : score);
  const notify = useRef(onCounted);
  notify.current = onCounted;
  useEffect(() => {
    if (!rises) {
      setValue(score);
      return undefined;
    }
    // 본 점수가 화면이 선 뒤에 도착해도 거기서부터 셉니다.
    setValue(seen);
    const timer = setTimeout(
      () => setValue(score),
      motionDurationMs(motionTokens.duration.d1) * AFTER_LIST_STEPS,
    );
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      clearTimeout(timer);
    };
  }, [score, seen, rises]);
  const counted = useCountUp(rises ? value : score);
  const done = rises && value === score && counted === score;
  useEffect(() => {
    if (done) notify.current?.();
  }, [done]);
  return rises ? counted : score;
}
