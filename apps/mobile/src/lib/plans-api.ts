// 요금제 · 내 권한(ADR-0144) — RPC `companion_plans()` · `companion_entitlements()`를 부릅니다.
// 혜택 숫자 · 상품 id는 서버 표가 정본이라 앱은 들지 않습니다(요금제를 앱 업데이트 없이 바꿈). 가격은 스토어(RevenueCat)에서만 옵니다.
// **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null. 모르는 요금제 id(서버가 먼저 더한 것)는 문구가 없어 버립니다.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

export const planIds = ["unlimited_tickets", "chat_plus", "premium"] as const;
export type PlanId = (typeof planIds)[number];
export type ChatPlanTier = "free" | "chat_plus" | "premium";

export type PlanBenefits = {
  readonly id: PlanId;
  readonly sortOrder: number;
  /** null = 대화에 손대지 않는 요금제(학습 전용). */
  readonly chatRank: number | null;
  /** 하루 무료 메시지 — null = 무제한. */
  readonly dailyFreeMessages: number | null;
  /** 공정 사용 하루 상한 — null = 없음. */
  readonly dailyMessageCap: number | null;
  readonly monthlyCoins: number;
  readonly unlimitedTickets: boolean;
  readonly allCharacters: boolean;
  /** BEST 표시. */
  readonly highlight: boolean;
  readonly products: { readonly monthly: string | null; readonly yearly: string | null };
};

export type CoinPackProduct = {
  readonly productId: string;
  readonly coins: number;
  readonly bonusCoins: number;
};

export type PlansCatalog = {
  readonly version: number;
  readonly freeDailyMessages: number;
  readonly plans: readonly PlanBenefits[];
  readonly coinPacks: readonly CoinPackProduct[];
};

export type PlanEntitlement = {
  readonly id: PlanId;
  readonly productId: string;
  readonly status: "active" | "cancelled" | "billing_issue";
  readonly willRenew: boolean;
  readonly expiresAt: string | null;
};

export type PlanEntitlements = {
  readonly tier: ChatPlanTier;
  readonly unlimitedTickets: boolean;
  readonly entitlements: readonly PlanEntitlement[];
};

export type PlansClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

export type PlansClient = {
  readonly catalog: () => Promise<PlansCatalog | null>;
  readonly entitlements: () => Promise<PlanEntitlements | null>;
};

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
/** 숫자거나 null(= 무제한 · 없음). 그 밖은 undefined(틀림). */
const countOrNull = (value: unknown): number | null | undefined =>
  value === null ? null : (count(value) ?? undefined);
const textOrNull = (value: unknown): string | null | undefined =>
  value === null ? null : typeof value === "string" && value !== "" ? value : undefined;
const isPlanId = (value: unknown): value is PlanId =>
  typeof value === "string" && (planIds as readonly string[]).includes(value);

function parseJson(bodyText: string | null): unknown {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return null;
  }
}

/** 요금제 한 행 — 모르는 id면 "skip", 모양이 틀리면 null. */
function planFrom(raw: unknown): PlanBenefits | "skip" | null {
  if (!isRecord(raw)) return null;
  const products = raw["products"];
  if (!isRecord(products)) return null;
  const sortOrder = typeof raw["sortOrder"] === "number" ? raw["sortOrder"] : null;
  const chatRank = countOrNull(raw["chatRank"]);
  const dailyFreeMessages = countOrNull(raw["dailyFreeMessages"]);
  const dailyMessageCap = countOrNull(raw["dailyMessageCap"]);
  const monthlyCoins = count(raw["monthlyCoins"]);
  const monthly = textOrNull(products["monthly"]);
  const yearly = textOrNull(products["yearly"]);
  const flags = [raw["unlimitedTickets"], raw["allCharacters"], raw["highlight"]];
  if (
    sortOrder === null ||
    chatRank === undefined ||
    dailyFreeMessages === undefined ||
    dailyMessageCap === undefined ||
    monthlyCoins === null ||
    monthly === undefined ||
    yearly === undefined ||
    flags.some((flag) => typeof flag !== "boolean")
  ) {
    return null;
  }
  if (!isPlanId(raw["id"])) return "skip";
  return {
    id: raw["id"],
    sortOrder,
    chatRank,
    dailyFreeMessages,
    dailyMessageCap,
    monthlyCoins,
    unlimitedTickets: raw["unlimitedTickets"] === true,
    allCharacters: raw["allCharacters"] === true,
    highlight: raw["highlight"] === true,
    products: { monthly, yearly },
  };
}

function coinPackFrom(raw: unknown): CoinPackProduct | null {
  if (!isRecord(raw)) return null;
  const productId = textOrNull(raw["productId"]);
  const coins = count(raw["coins"]);
  const bonusCoins = count(raw["bonusCoins"]);
  return typeof productId === "string" && coins !== null && bonusCoins !== null
    ? { productId, coins, bonusCoins }
    : null;
}

export function plansCatalogFrom(bodyText: string | null): PlansCatalog | null {
  const raw = parseJson(bodyText);
  if (!isRecord(raw) || !isRecord(raw["free"])) return null;
  const version = count(raw["version"]);
  const freeDailyMessages = count(raw["free"]["dailyFreeMessages"]);
  const rawPlans = raw["plans"];
  const rawPacks = raw["coinPacks"];
  if (version === null || freeDailyMessages === null) return null;
  if (!Array.isArray(rawPlans) || !Array.isArray(rawPacks)) return null;
  const plans: PlanBenefits[] = [];
  for (const item of rawPlans) {
    const plan = planFrom(item);
    if (plan === null) return null;
    if (plan !== "skip") plans.push(plan);
  }
  const coinPacks: CoinPackProduct[] = [];
  for (const item of rawPacks) {
    const pack = coinPackFrom(item);
    if (pack === null) return null;
    coinPacks.push(pack);
  }
  return { version, freeDailyMessages, plans, coinPacks };
}

const entitlementStatuses = ["active", "cancelled", "billing_issue"] as const;
const chatTiers: readonly ChatPlanTier[] = ["free", "chat_plus", "premium"];

function entitlementFrom(raw: unknown): PlanEntitlement | "skip" | null {
  if (!isRecord(raw)) return null;
  const productId = textOrNull(raw["productId"]);
  const expiresAt = textOrNull(raw["expiresAt"]);
  const status = entitlementStatuses.find((value) => value === raw["status"]);
  if (typeof productId !== "string" || expiresAt === undefined || status === undefined) return null;
  if (typeof raw["willRenew"] !== "boolean") return null;
  if (!isPlanId(raw["id"])) return "skip";
  return { id: raw["id"], productId, status, willRenew: raw["willRenew"], expiresAt };
}

export function planEntitlementsFrom(bodyText: string | null): PlanEntitlements | null {
  const raw = parseJson(bodyText);
  if (!isRecord(raw) || !Array.isArray(raw["entitlements"])) return null;
  const tier = chatTiers.find((value) => value === raw["tier"]);
  if (tier === undefined || typeof raw["unlimitedTickets"] !== "boolean") return null;
  const entitlements: PlanEntitlement[] = [];
  for (const item of raw["entitlements"]) {
    const entitlement = entitlementFrom(item);
    if (entitlement === null) return null;
    if (entitlement !== "skip") entitlements.push(entitlement);
  }
  return { tier, unlimitedTickets: raw["unlimitedTickets"], entitlements };
}

export function createPlansClient(deps: PlansClientDeps): PlansClient {
  async function call<T>(fn: string, parse: (text: string | null) => T | null): Promise<T | null> {
    try {
      const token = await deps.token();
      if (token === null) return null;
      const outcome = await deps.post((config) => ({
        url: `${config.url}/rest/v1/rpc/${fn}`,
        init: { method: "POST", headers: bearerHeaders(config, token), body: "{}" },
      }));
      return outcome.ok && isSuccessStatus(outcome.status) ? parse(outcome.bodyText) : null;
    } catch {
      return null;
    }
  }
  return {
    catalog: () => call("companion_plans", plansCatalogFrom),
    entitlements: () => call("companion_entitlements", planEntitlementsFrom),
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과 · 핸들러)에서만 부릅니다. */
export const plansClient = (): PlansClient =>
  createPlansClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
