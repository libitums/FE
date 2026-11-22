// 구독 성공 알림의 상태(ADR-0160 D7) — 구독 구매가 `purchased`로 끝난 뒤 서버 따라잡기 창 안에서 다시 읽은 권한에 새 요금제가 생기면 한 번.
// 창은 시각 기한이라 따라잡기가 새 요금제 없이 끝나도(기간 바꿈 · 다음 갱신 내림 · 늦은 웹훅) 남지 않고, 복원 · 엽전 팩은 창을 닫습니다.

import { useRef, useState } from "@lynx-js/react";

import type { PlanEntitlements } from "../lib/plans-api";
import { REFRESH_DEADLINE_MS } from "../lib/purchase-refresh";
import { planActivationOf, type PlanActivation } from "../screens/plans/plan-change";

/**
 * 구매 뒤 알림을 기다리는 창 — 서버 따라잡기 일정의 합(60초, ADR-0163 D1) + 여유. 옛 창(2초 × 5 + 2초)은 내림의 PRODUCT_CHANGE 웹훅이
 * 늦게 닿으면(2026-11-19 기기) 이미 닫혀 알림이 뜨지 않았습니다. 일정과 창은 한 출처입니다.
 */
export const ACTIVATION_WINDOW_MS = REFRESH_DEADLINE_MS + 2000;

/**
 * 구독 결제 하나를 감쌉니다 — 창은 결제가 `purchased`로 끝난 뒤에 엽니다. 단추를 누를 때 열면 결제 시트에서 승인하는 시간
 * (2026-11-19 샌드박스 실측 11초)이 창을 먹어, 웹훅이 닿았을 때 창이 이미 닫혀 있습니다. 누를 때는 앞 창을 닫아 둡니다.
 */
export function armOnPurchased<T extends { readonly kind: string }>(
  activation: { readonly arm: () => void; readonly disarm: () => void },
  purchase: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    activation.disarm();
    const result = await purchase();
    if (result.kind === "purchased") activation.arm();
    return result;
  };
}

export function usePlanActivation(
  entitlements: PlanEntitlements | null,
  now: () => number = Date.now,
): {
  readonly activated: PlanActivation | null;
  readonly onActivatedShown: () => void;
  readonly arm: () => void;
  readonly disarm: () => void;
  readonly observe: (next: PlanEntitlements) => void;
} {
  const [activated, setActivated] = useState<PlanActivation | null>(null);
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
      // 미뤄진 내림이면 「켜짐」이 아니라 「언제부터」를 알립니다(scheduled).
      const activation = planActivationOf(latest.current, next);
      if (activation === null) return;
      until.current = 0;
      setActivated(activation);
    },
  };
}
