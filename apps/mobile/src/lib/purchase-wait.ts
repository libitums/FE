// 구매 뒤 서버 확인 대기의 상태(ADR-0163 D2) — 결제가 끝나고 서버(웹훅)가 바뀔 때까지 화면이 무엇을 보일지 정합니다. 순수.

import type { RefreshOutcome, RefreshSettle } from "./purchase-refresh";

export type PurchaseWaitTarget = "coins" | "plan" | "any";

export type PurchaseWait =
  | { readonly phase: "idle" }
  | {
      readonly phase: "waiting";
      readonly target: PurchaseWaitTarget;
      readonly productId: string | null;
    }
  | { readonly phase: "done"; readonly target: PurchaseWaitTarget; readonly coins: number | null }
  | { readonly phase: "late"; readonly target: PurchaseWaitTarget };

export type PurchasePillView =
  | { readonly kind: "waiting" }
  | { readonly kind: "late" }
  | { readonly kind: "added"; readonly coins: number };

export const idleWait: PurchaseWait = { phase: "idle" };

/** 완료 · 늦음 안내가 남는 시간 — 지나면 idle(ADR-0163 D2). */
export const WAIT_DONE_MS = 3000;
export const WAIT_LATE_MS = 6000;

/** 따라잡기의 멈춤 조건 → 무엇을 기다리나(스켈레톤이 설 칩). */
export function waitTargetOf(settle: RefreshSettle): PurchaseWaitTarget {
  if (settle === "balance") return "coins";
  return settle === "entitlements" ? "plan" : "any";
}

/** 따라잡기가 끝나면 — 기다리는 중이 아니면 그대로(앞 대기의 늦은 결과는 부르는 쪽이 버림). */
export function waitAfter(wait: PurchaseWait, outcome: RefreshOutcome): PurchaseWait {
  if (wait.phase !== "waiting") return wait;
  if (!outcome.reflected) return { phase: "late", target: wait.target };
  const { balanceBefore, balance } = outcome;
  const raised =
    balanceBefore !== null && balance !== null && balance > balanceBefore
      ? balance - balanceBefore
      : null;
  return { phase: "done", target: wait.target, coins: raised };
}

/** 칩이 값 대신 스켈레톤인가 — 기다리는 동안 대상 칩(복원은 둘 다). */
export function chipUpdating(wait: PurchaseWait, chip: "coins" | "plan"): boolean {
  return wait.phase === "waiting" && (wait.target === "any" || wait.target === chip);
}

/** 엽전 팩 카드의 「Adding to your wallet」 — 엽전을 기다리는 동안 산 상품만. */
export function packAdding(wait: PurchaseWait, productId: string): boolean {
  return wait.phase === "waiting" && wait.target === "coins" && wait.productId === productId;
}

/** 위 알약 — 구독의 done은 구독 성공 알림(ADR-0160 D7)이 맡아 알약이 없습니다. */
export function pillOf(wait: PurchaseWait): PurchasePillView | null {
  if (wait.phase === "waiting") return { kind: "waiting" };
  if (wait.phase === "late") return { kind: "late" };
  if (wait.phase === "done" && wait.coins !== null) return { kind: "added", coins: wait.coins };
  return null;
}

/** 오름 칸 — `from`에서 `to`까지 `steps` 칸, 감속(ease-out 세제곱). 같거나 내려가면 새 값 하나. */
export function countUpFrames(from: number, to: number, steps: number): readonly number[] {
  if (to <= from || steps < 1) return [to];
  const frames: number[] = [from];
  for (let index = 1; index < steps; index += 1) {
    const progress = 1 - (1 - index / steps) ** 3;
    const value = Math.round(from + (to - from) * progress);
    frames.push(Math.min(to, Math.max(frames[index - 1] ?? from, value)));
  }
  frames.push(to);
  return frames;
}
