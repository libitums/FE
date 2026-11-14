import { useEffect, useRef, useState } from "@lynx-js/react";

import { LAUNCH_FLYING_COINS } from "../launch/LaunchCoinFlight";
import type { StreakRewardWiring } from "./streak-reward.contract";

// 연속 학습 보상의 「Collect」(ADR-0143) — 서버 지급 한 번 → 모달이 걷히고 엽전이 머리 칩으로 날아간 뒤 닫힘.
//
// 안정성: 지급은 한 번만 부르고(두 번째 탭 무시) 실패해도 다시 부르지 않습니다 — 실패 · 이미 받음이면 Continue처럼 닫습니다.
// 날기는 LaunchCoinFlight의 안전 타이머가 끝을 보장해 측정이 답하지 않는 기기에서도 막이 남지 않습니다. 지급을 기다리는 동안이나
// 날아가는 동안 닫혀도(뒤로가기) 칩이 남은 몫 없이 최종 잔액으로 돌아오게 `onSettled`를 꼭 한 번 부릅니다.

export type StreakCollect = {
  /** 지급이 됐고 엽전이 날아가는 중 — 모달이 걷힙니다. */
  readonly flying: boolean;
  readonly collect: () => void;
  readonly landed: (landed: number) => void;
};

export function useStreakCollect(input: {
  readonly reward: StreakRewardWiring | undefined;
  readonly days: number;
  readonly reduced: boolean;
  readonly onClose: () => void;
}): StreakCollect {
  const [flying, setFlying] = useState(false);
  const latest = useRef(input);
  latest.current = input;
  const busy = useRef(false);
  const mounted = useRef(true);
  const flyingRef = useRef(false);
  const settled = useRef(false);
  const settle = () => {
    if (settled.current) return;
    settled.current = true;
    latest.current.reward?.onSettled();
  };
  useEffect(
    () => () => {
      mounted.current = false;
      if (flyingRef.current) settle();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const collect = () => {
    const { reward, days, reduced } = latest.current;
    if (reward === undefined || busy.current) return;
    busy.current = true;
    void reward
      .claim()
      .catch(() => null)
      .then((claim) => {
        reward.onClaimed(claim, days);
        // 기다리는 동안 닫혔으면 칩만 맞춥니다.
        if (!mounted.current) {
          reward.onSettled();
          return;
        }
        if (claim === null || !claim.granted || reduced) {
          settle();
          latest.current.onClose();
          return;
        }
        flyingRef.current = true;
        setFlying(true);
      });
  };

  const landed = (count: number) => {
    latest.current.reward?.onCoinLanded(count, LAUNCH_FLYING_COINS);
    if (count >= LAUNCH_FLYING_COINS && !settled.current) {
      settle();
      latest.current.onClose();
    }
  };

  return { flying, collect, landed };
}
