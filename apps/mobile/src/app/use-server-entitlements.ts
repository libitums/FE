// 내 권한(서버 정본, ADR-0144 D2)의 상태와 다시 읽기 — 화면 진입 · 구매 뒤뿐 아니라, 세션이 권한의 만료(`expiresAt`)를 넘으면
// 그 경계에서 한 번, 앱이 앞으로 오면(호스트 `contentSyncOpportunity`) 한 번 더 읽습니다. 스토어는 내림 · 같은 수준 바꿈을 기간 끝으로
// 미루므로(2026-11-19 Premium → Unlimited Tickets) 경계를 넘긴 세션의 머리 칩이 옛 요금제에 남지 않게 합니다.
// 다시 읽기가 실패(null)하면 지금 값을 둡니다. 결제를 열 수 없으면(`active` 거짓) 읽지 않습니다.

import { useEffect, useLynxGlobalEventListener, useRef, useState } from "@lynx-js/react";

import { entitlementsRefreshDelay } from "../lib/plan-access";
import type { PlanEntitlements, PlansClient } from "../lib/plans-api";
import { contentSyncEventName } from "./use-episode-content-refresh";

export function useServerEntitlements(
  active: boolean,
  client: () => PlansClient,
  now: () => number = Date.now,
): readonly [PlanEntitlements | null, (next: PlanEntitlements | null) => void, () => void] {
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  // 경계 타이머 · 앞으로 옴 콜백은 걸 때의 렌더에 묶이므로 지금 값을 ref로 읽습니다.
  const activeNow = useRef(active);
  // oxlint-disable-next-line react/immutability
  activeNow.current = active;
  const reread = () => {
    if (!activeNow.current) return;
    void client()
      .entitlements()
      .then((next) => {
        if (next !== null) setEntitlements(next);
      });
  };

  useEffect(() => {
    if (!active) return;
    const delay = entitlementsRefreshDelay(entitlements, now());
    if (delay === null) return;
    const timer = setTimeout(() => reread(), delay);
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android) — 화살표로 감쌉니다.
    return () => clearTimeout(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [active, entitlements]);

  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    reread();
  });

  return [entitlements, setEntitlements, reread];
}
