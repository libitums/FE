// 연속 학습 엽전 보상 결선(ADR-0143) — 로그인 사용자의 연속 학습 모달에 「받았나 · 지급 · 칩 맞추기」를 넘깁니다.
// 지급은 Collect를 누를 때 한 번(서버가 연속을 세고 이정표마다 한 번만 줌), 실패는 다시 부르지 않습니다. 받은 잔액은 엽전 출시 결선의
// 서버 잔액으로 들어가고(`acceptBalance`), 엽전이 날아가는 동안은 받은 몫 중 아직 닿지 않은 만큼(`held`)을 칩에서 빼 두어 닿을 때마다
// 칩이 오릅니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { topBarCoinIconId } from "../components/TopBar";
import { emitCompanionEvent } from "../lib/companion-events";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { localDayFrom } from "../lib/progress-api";
import { streakRewardClient, type StreakRewardClaim } from "../lib/streak-reward-api";
import type { LocalDay } from "../lib/learning-progress.contract";
import type { StreakRewardWiring } from "../screens/journey-map/streak-reward.contract";
import {
  deviceStreakRewardStore,
  streakRewardCollected,
  type StreakRewardRecord,
  type StreakRewardStore,
} from "./streak-reward-record";

export type StreakRewardInput = {
  readonly signedIn: boolean;
  readonly eventSink: EpisodeIntroEventSink;
  /** 지급 응답의 지갑 잔액 — 머리 엽전 칩의 서버 잔액이 됩니다. */
  readonly acceptBalance: (balance: number) => void;
  /** 테스트 주입 — 기본은 앱 서버 · 기기 저장소. */
  readonly claim?: (today: LocalDay) => Promise<StreakRewardClaim | null>;
  readonly store?: StreakRewardStore;
};

export function useStreakReward(input: StreakRewardInput): {
  readonly wiring: StreakRewardWiring | undefined;
  /** 칩에서 잠시 빼 둘 몫 — 날아가는 엽전이 아직 닿지 않은 만큼. */
  readonly held: number;
} {
  const store = input.store ?? deviceStreakRewardStore;
  const [record, setRecord] = useState<StreakRewardRecord | null>(null);
  const [held, setHeld] = useState(0);
  const amount = useRef(0);
  const latest = useRef(input);
  latest.current = input;

  // 계정의 기록은 background에서 읽습니다(저장소 · 로그인 읽기). 계정이 바뀌면 다시 읽습니다.
  useEffect(() => {
    setRecord(input.signedIn ? store.read() : null);
    setHeld(0);
  }, [input.signedIn]);

  if (!input.signedIn) return { wiring: undefined, held: 0 };
  const today = localDayFrom(new Date());
  const wiring: StreakRewardWiring = {
    collected: (days) => streakRewardCollected(record, days, today),
    claim: () => (latest.current.claim ?? ((day) => streakRewardClient().claim(day)))(today),
    onClaimed: (claim) => {
      if (claim === null) return;
      latest.current.acceptBalance(claim.balance);
      // 이정표 날이면 받았든(이번) 이미 받았든(전에) 같은 날 다시 Collect를 보이지 않습니다.
      if (claim.amount > 0) {
        const next = { days: claim.days, day: today };
        store.write(next);
        setRecord(next);
      }
      if (!claim.granted) return;
      amount.current = claim.amount;
      setHeld(claim.amount);
      emitCompanionEvent(latest.current.eventSink, {
        name: "streak_reward_collected",
        surface: "learning",
        days: String(claim.days),
        amount: String(claim.amount),
      });
    },
    onCoinLanded: (landed, of) =>
      setHeld(Math.round(amount.current * (1 - Math.min(1, landed / of)))),
    onSettled: () => setHeld(0),
    coinTargetId: topBarCoinIconId,
  };
  return { wiring, held };
}
