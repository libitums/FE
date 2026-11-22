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
 * 출발 값은 처음 선 때의 것으로 고정합니다 — 세기 시작하며 `onStarted`로 알린 뒤 `seen`이 지워져도 끝까지 셉니다.
 */
export function useRisingScore(score: number, seen: number | null, onStarted?: () => void): number {
  const reduced = useReducedMotion();
  const [from] = useState(seen);
  const started = useRef(onStarted);
  started.current = onStarted;
  const rises = !reduced && from !== null && from < score;
  const [value, setValue] = useState(rises ? from : score);
  useEffect(() => {
    if (!rises) {
      setValue(score);
      return undefined;
    }
    const timer = setTimeout(
      () => {
        setValue(score);
        started.current?.();
      },
      motionDurationMs(motionTokens.duration.d1) * AFTER_LIST_STEPS,
    );
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android).
    return () => {
      clearTimeout(timer);
    };
  }, [score, rises]);
  const counted = useCountUp(rises ? value : score);
  return rises ? counted : score;
}
