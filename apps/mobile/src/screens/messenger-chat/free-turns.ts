// 대화 한 통의 요금 계획 · 보내기 관문입니다 — 순수. 요금은 서버 규칙을 따릅니다(ADR-0155): 무료 체험 20통은 인물과 상관없이 한
// 묶음이고(추천 친구와 함께 바뀜 — 서버가 모든 인물의 체험 통을 함께 셉니다), 다 쓰면 첫 통부터 메시지 요금입니다. 하루 무료 수는 없습니다.

/**
 * 첫 입장 안내(ADR-0139)를 맡는 인물 — 체험은 더 이상 이 인물만의 것이 아닙니다(공용 체험). 안내 방 id는 `messenger-guide`의
 * `GUIDE_ROOM_ID`가 정본이고, 이 이름은 옛 테스트 · 지갑 읽기 호환으로 남깁니다.
 */
export const TRIAL_CHARACTER_ID = "duksu";
/** 서버 `companion.settings.trial_limit`과 같은 값입니다(지갑은 남은 수만 줍니다). 모든 인물이 함께 씁니다. */
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

/** 인물과 상관없는 계획입니다 — 공용 체험이 남았으면 어느 방이든 무료, 다 쓰면 엽전. */
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
