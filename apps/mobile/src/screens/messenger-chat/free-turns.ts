// 대화 한 통의 요금 계획 · 보내기 관문입니다 — 순수. 요금은 서버 규칙을 따릅니다(ADR-0155): 무료 체험 20통은 인물을 가리지 않는
// 합산이라(ADR-0164 D3) 남았으면 어느 인물이든 무료, 다 쓰면 어느 인물이든 첫 통부터 메시지 요금입니다. 하루 무료 수는 없습니다.

/** 서버 `companion.settings.trial_limit`과 같은 값입니다(지갑은 합산 남은 수만 줍니다). */
export const TRIAL_TOTAL = 20;

export type ChatTier = "free" | "unlimited";
export type TurnPlan =
  | { readonly kind: "unlimited" }
  /** 체험이 남았습니다 — 남은 수를 아직 모르면(서버 지갑을 못 읽음) null이고, 판정은 서버가 합니다. */
  | { readonly kind: "trial"; readonly remaining: number | null; readonly total: number }
  | { readonly kind: "last-free"; readonly total: number; readonly price: number }
  | { readonly kind: "coin"; readonly price: number };
export type SendGate =
  | { readonly kind: "open" }
  | { readonly kind: "free" }
  | { readonly kind: "pay"; readonly price: number }
  | { readonly kind: "top-up"; readonly price: number; readonly shortBy: number };

export function turnPlanFor(input: {
  readonly tier: ChatTier;
  readonly trialRemaining: number | null;
  readonly price: number;
}): TurnPlan {
  const { tier, trialRemaining, price } = input;
  if (tier === "unlimited") return { kind: "unlimited" };
  if (trialRemaining === null) return { kind: "trial", remaining: null, total: TRIAL_TOTAL };
  if (trialRemaining <= 0) return { kind: "coin", price };
  if (trialRemaining === 1) return { kind: "last-free", total: TRIAL_TOTAL, price };
  return { kind: "trial", remaining: trialRemaining, total: TRIAL_TOTAL };
}

export function sendGateFor(plan: TurnPlan, balance: number): SendGate {
  switch (plan.kind) {
    case "unlimited":
      return { kind: "open" };
    case "trial":
    case "last-free":
      return { kind: "free" };
    case "coin": {
      const have = Number.isFinite(balance) && balance > 0 ? balance : 0;
      return have >= plan.price
        ? { kind: "pay", price: plan.price }
        : { kind: "top-up", price: plan.price, shortBy: plan.price - have };
    }
  }
}
