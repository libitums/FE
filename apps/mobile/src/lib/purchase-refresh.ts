// 구매 · 복원 뒤 서버 상태 따라잡기(ADR-0144 2단계 · ADR-0163) — 등급 · 엽전의 정본은 서버이고, 서버는 RevenueCat 웹훅으로만 바뀝니다.
// 스토어 결제가 끝난 순간에는 웹훅이 아직 안 닿았을 수 있어, 권한(`companion_entitlements`)과 지갑 잔액을 일정(1 · 2 · 2 · 3 · 5 · 5 · 7 ·
// 10 · 10 · 15초, 합 60초)대로 다시 읽고 바뀐 값을 알립니다. 바뀌면 곧바로 멈추고(reflected), 끝까지 그대로면 마지막 값을 알리고
// 끝냅니다(late — 앞으로 옴 · 만료 경계 다시 읽기가 뒤를 잇습니다). **던지지 않습니다.**

import type { PlanEntitlements } from "./plans-api";

export type PurchaseRefreshDeps = {
  readonly entitlements: () => Promise<PlanEntitlements | null>;
  readonly balance: () => Promise<number | null>;
  readonly onEntitlements: (next: PlanEntitlements) => void;
  readonly onBalance: (balance: number) => void;
  readonly wait: (ms: number) => Promise<void>;
  /**
   * 언제 멈추나 — 기본(any)은 권한이나 잔액이 바뀌면. 구독 구매는 권한이(ADR-0160 성공 알림 — Premium은 엽전이 먼저 닿을 수 있음),
   * 엽전 팩은 잔액이 바뀌어야 멈춥니다.
   */
  readonly settle?: RefreshSettle;
};

export type RefreshSettle = "any" | "entitlements" | "balance";

/** 따라잡기의 끝 — 멈춤 조건이 참이었나(reflected)와 전 · 마지막 잔액. */
export type RefreshOutcome = {
  readonly reflected: boolean;
  readonly balanceBefore: number | null;
  readonly balance: number | null;
};

/** 다시 읽기 전 기다림(ms) — 처음은 촘촘하게, 뒤는 느슨하게. 구독 성공 알림 창도 이 합을 씁니다(ADR-0163 D1). */
export const REFRESH_SCHEDULE_MS: readonly number[] = [
  1000, 2000, 2000, 3000, 5000, 5000, 7000, 10000, 10000, 15000,
];
export const REFRESH_DEADLINE_MS = REFRESH_SCHEDULE_MS.reduce((sum, ms) => sum + ms, 0);

/** 권한이 같은지 — 등급 · 무제한 티켓 · 권한 줄(상품 · 상태 · 만료 · 미뤄진 바꿈)로 봅니다. 순수. */
export function sameEntitlements(a: PlanEntitlements | null, b: PlanEntitlements | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.tier !== b.tier || a.unlimitedTickets !== b.unlimitedTickets) return false;
  if (a.entitlements.length !== b.entitlements.length) return false;
  return a.entitlements.every((row, index) => {
    const other = b.entitlements[index];
    return (
      other !== undefined &&
      row.productId === other.productId &&
      row.status === other.status &&
      row.expiresAt === other.expiresAt &&
      row.pendingProductId === other.pendingProductId
    );
  });
}

async function safely<T>(read: () => Promise<T | null>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/** 구매 · 복원 전의 값(`before`)과 달라질 때까지 일정대로 다시 읽습니다. 바뀐 값 · 마지막 값을 알리고 결과를 돌려줍니다. */
export async function refreshAfterPurchase(
  deps: PurchaseRefreshDeps,
  before: { readonly entitlements: PlanEntitlements | null; readonly balance: number | null },
  schedule: readonly number[] = REFRESH_SCHEDULE_MS,
): Promise<RefreshOutcome> {
  const settle = deps.settle ?? "any";
  let lastBalance = before.balance;
  for (let attempt = 0; attempt < schedule.length; attempt += 1) {
    await deps.wait(schedule[attempt] ?? 0);
    const [entitlements, balance] = await Promise.all([
      safely(deps.entitlements),
      safely(deps.balance),
    ]);
    if (balance !== null) lastBalance = balance;
    const entitlementsMoved =
      entitlements !== null && !sameEntitlements(entitlements, before.entitlements);
    const balanceMoved = balance !== null && balance !== before.balance;
    const last = attempt === schedule.length - 1;
    if (entitlements !== null && (entitlementsMoved || last)) deps.onEntitlements(entitlements);
    if (balance !== null && (balanceMoved || last)) deps.onBalance(balance);
    const reflected =
      settle === "entitlements"
        ? entitlementsMoved
        : settle === "balance"
          ? balanceMoved
          : entitlementsMoved || balanceMoved;
    if (reflected) return { reflected, balanceBefore: before.balance, balance: lastBalance };
  }
  return { reflected: false, balanceBefore: before.balance, balance: lastBalance };
}

/**
 * 구매 · 복원 하나를 돌리고, 성공(`purchased` · `restored`)이면 기다림을 알리고(`onWaiting`) 서버 따라잡기를 뒤에서 시작합니다 — 화면은
 * 결과를 곧바로 받고, 따라잡기가 끝나면 `onSettled`가 결과를 받습니다(ADR-0163). 결제를 열 수 없으면(`available` 거짓) 그냥 돌립니다.
 * 전의 잔액은 결제 시트와 함께 읽기 시작합니다 — 시트를 늦추지 않습니다.
 */
export async function runWithServerRefresh<T extends { readonly kind: string }>(
  deps: PurchaseRefreshDeps & {
    readonly available: boolean;
    readonly current: PlanEntitlements | null;
    readonly onWaiting?: () => void;
    readonly onSettled?: (outcome: RefreshOutcome) => void;
  },
  task: () => Promise<T>,
): Promise<T> {
  if (!deps.available) return task();
  const before = safely(deps.balance);
  const result = await task();
  if (result.kind === "purchased" || result.kind === "restored") {
    deps.onWaiting?.();
    void before
      .then((balance) => refreshAfterPurchase(deps, { entitlements: deps.current, balance }))
      .then((outcome) => deps.onSettled?.(outcome));
  }
  return result;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
