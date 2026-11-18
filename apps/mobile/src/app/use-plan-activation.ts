// 구독 성공 알림의 상태(ADR-0160 D7) — 구독 구매가 `purchased`로 끝난 뒤 서버 따라잡기 창 안에서 다시 읽은 권한에 새 요금제가 생기면 한 번.
// 창은 시각 기한이라 따라잡기가 새 요금제 없이 끝나도(기간 바꿈 · 다음 갱신 내림 · 늦은 웹훅) 남지 않고, 복원 · 엽전 팩은 창을 닫습니다.

import { useRef, useState } from "@lynx-js/react";

import type { PlanEntitlements, PlanId } from "../lib/plans-api";
import { REFRESH_ATTEMPTS, REFRESH_INTERVAL_MS } from "../lib/purchase-refresh";
import { newlyActivePlan } from "../screens/plans/plan-change";

/** 구매 뒤 알림을 기다리는 창 — 서버 따라잡기(2초 × 5) + 여유. */
export const ACTIVATION_WINDOW_MS = REFRESH_ATTEMPTS * REFRESH_INTERVAL_MS + 2000;

export function usePlanActivation(
  entitlements: PlanEntitlements | null,
  now: () => number = Date.now,
): {
  readonly activated: PlanId | null;
  readonly onActivatedShown: () => void;
  readonly arm: () => void;
  readonly disarm: () => void;
  readonly observe: (next: PlanEntitlements) => void;
} {
  const [activated, setActivated] = useState<PlanId | null>(null);
  const until = useRef(0);
  // 따라잡기 콜백은 구매 때의 렌더에 묶이므로 지금 권한은 ref로 읽습니다.
  const latest = useRef<PlanEntitlements | null>(null);
  // oxlint-disable-next-line react/immutability
  latest.current = entitlements;
  return {
    activated,
    onActivatedShown: () => setActivated(null),
    arm: () => {
      until.current = now() + ACTIVATION_WINDOW_MS;
    },
    disarm: () => {
      until.current = 0;
    },
    observe: (next) => {
      if (now() >= until.current) return;
      const plan = newlyActivePlan(latest.current, next);
      if (plan === null) return;
      until.current = 0;
      setActivated(plan);
    },
  };
}
