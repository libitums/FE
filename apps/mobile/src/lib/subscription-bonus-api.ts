// Chat Plus 첫 구독 보너스 알림(ADR-0196 D3) — RPC `companion_claim_subscription_bonus`를 부릅니다. 지급은 웹훅이 이미 했고, 이 RPC는 「알리지 않은
// 보너스」를 한 번 꺼내 알린 것으로 찍습니다. **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

/** announced = 이번에 처음 알림 · already_announced = 다른 기기 · 설치에서 이미 알림 · none = 아직 지급 없음(체험 · 웹훅 늦음). */
export type SubscriptionBonusReason = "announced" | "already_announced" | "none";

/** 이번에 알린 수(아니면 0) · 이유 · 지갑 잔액. */
export type SubscriptionBonusClaim = {
  readonly amount: number;
  readonly reason: SubscriptionBonusReason;
  readonly balance: number;
};

export type SubscriptionBonusClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

const reasons: readonly SubscriptionBonusReason[] = ["announced", "already_announced", "none"];

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

export function subscriptionBonusClaimFrom(bodyText: string | null): SubscriptionBonusClaim | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    const wallet = raw?.wallet as Record<string, unknown> | null | undefined;
    const amount = count(raw?.amount);
    const balance = count(wallet?.balance);
    const reason = reasons.find((value) => value === raw?.reason);
    return amount === null || balance === null || reason === undefined
      ? null
      : { amount, reason, balance };
  } catch {
    return null;
  }
}

export function createSubscriptionBonusClient(deps: SubscriptionBonusClientDeps): {
  readonly claim: () => Promise<SubscriptionBonusClaim | null>;
} {
  return {
    claim: async () => {
      try {
        const token = await deps.token();
        if (token === null) return null;
        const outcome = await deps.post((config) => ({
          url: `${config.url}/rest/v1/rpc/companion_claim_subscription_bonus`,
          init: { method: "POST", headers: bearerHeaders(config, token), body: "{}" },
        }));
        return outcome.ok && isSuccessStatus(outcome.status)
          ? subscriptionBonusClaimFrom(outcome.bodyText)
          : null;
      } catch {
        return null;
      }
    },
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과)에서만 부릅니다. */
export const subscriptionBonusClient = () =>
  createSubscriptionBonusClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
