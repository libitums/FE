// 구매 · 복원 뒤 서버 따라잡기와 그 동안의 화면 상태(ADR-0144 2단계 · ADR-0163) — 결제가 성공하면 대기(waiting)로 두고, 따라잡기가 끝나면
// done(서버가 바뀜) · late(60초 동안 그대로)로 바꿨다가 잠시 뒤 idle로 돌아갑니다. 같은 동안 새 구매가 시작되면 앞 따라잡기의 결과는 버립니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import type { PlanEntitlements, PlansClient } from "../lib/plans-api";
import { runWithServerRefresh, sleep, type RefreshSettle } from "../lib/purchase-refresh";
import {
  WAIT_DONE_MS,
  WAIT_LATE_MS,
  idleWait,
  waitAfter,
  waitTargetOf,
  type PurchaseWait,
} from "../lib/purchase-wait";
import { reportServerBalance } from "./messenger-chat-wiring";

export type PurchaseWaitControl = {
  readonly wait: PurchaseWait;
  /** 구매 · 복원 하나를 돌립니다 — 성공이면 결과를 곧바로 돌려주고 뒤에서 서버를 따라잡습니다. */
  readonly run: <T extends { readonly kind: string }>(
    task: () => Promise<T>,
    settle?: RefreshSettle,
    productId?: string | null,
  ) => Promise<T>;
};

export function usePurchaseWait(options: {
  readonly available: boolean;
  readonly current: PlanEntitlements | null;
  readonly client: () => PlansClient;
  readonly onEntitlements: (next: PlanEntitlements) => void;
}): PurchaseWaitControl {
  const [wait, setWait] = useState<PurchaseWait>(idleWait);
  // 차례 번호 — 따라잡기 콜백은 시작할 때의 렌더에 묶이므로 지금 차례를 ref로 봅니다.
  const ticket = useRef(0);

  useEffect(() => {
    if (wait.phase !== "done" && wait.phase !== "late") return;
    const timer = setTimeout(
      () => setWait(idleWait),
      wait.phase === "done" ? WAIT_DONE_MS : WAIT_LATE_MS,
    );
    // Lynx의 clearTimeout은 인자 하나만 받습니다(Android) — 화살표로 감쌉니다.
    return () => clearTimeout(timer);
  }, [wait]);

  const run = <T extends { readonly kind: string }>(
    task: () => Promise<T>,
    settle: RefreshSettle = "any",
    productId: string | null = null,
  ): Promise<T> => {
    let mine = 0;
    return runWithServerRefresh(
      {
        available: options.available,
        current: options.current,
        entitlements: () => options.client().entitlements(),
        balance: () => options.client().balance(),
        onEntitlements: options.onEntitlements,
        onBalance: reportServerBalance,
        wait: sleep,
        settle,
        onWaiting: () => {
          ticket.current += 1;
          mine = ticket.current;
          setWait({ phase: "waiting", target: waitTargetOf(settle), productId });
        },
        onSettled: (outcome) => {
          if (mine !== ticket.current) return;
          setWait((now) => waitAfter(now, outcome));
        },
      },
      task,
    );
  };

  return { wait, run };
}
