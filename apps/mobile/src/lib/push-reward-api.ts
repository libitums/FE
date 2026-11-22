// 푸시 캠페인 보상 받기(ADR-0175) — RPC `push_campaign_claim_reward`를 부릅니다. 서버가 수신자 · 기한 · 캠페인당 한 번을 검증하고
// 지급합니다. **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

/** 서버 판정 — granted만 이번에 받은 것입니다. */
export type PushRewardStatus =
  | "granted"
  | "already_claimed"
  | "not_recipient"
  | "expired"
  | "unknown";

/** 받은(또는 이미 받은) 보상 — 무제한 티켓은 끝 시각까지. */
export type PushReward =
  | { readonly kind: "coins"; readonly amount: number }
  | { readonly kind: "tickets"; readonly hours: number; readonly untilMs: number };

export type PushRewardClaim = {
  readonly status: PushRewardStatus;
  readonly campaignId: string | null;
  readonly reward: PushReward | null;
  /** 지갑 잔액 — 응답에 없으면 null. */
  readonly balance: number | null;
};

export type PushRewardClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

const statuses: readonly PushRewardStatus[] = [
  "granted",
  "already_claimed",
  "not_recipient",
  "expired",
  "unknown",
];

const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;

/** 보상 칸 — 없으면 null, 모양이 틀리면 undefined. */
function rewardFrom(raw: Record<string, unknown>): PushReward | null | undefined {
  const kind = raw["kind"];
  if (kind === null || kind === undefined) return null;
  if (kind === "coins") {
    const amount = positive(raw["amount"]);
    return amount === null ? undefined : { kind: "coins", amount };
  }
  const hours = positive(raw["hours"]);
  const until = raw["passUntil"];
  const untilMs = typeof until === "string" ? Date.parse(until) : NaN;
  return kind === "unlimited_tickets" && hours !== null && Number.isFinite(untilMs)
    ? { kind: "tickets", hours, untilMs }
    : undefined;
}

export function pushRewardClaimFrom(bodyText: string | null): PushRewardClaim | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    const status = statuses.find((value) => value === raw?.["status"]);
    if (raw === null || status === undefined) return null;
    const reward = rewardFrom(raw);
    if (reward === undefined || (status === "granted" && reward === null)) return null;
    const campaignId = raw["campaignId"];
    const balance = (raw["wallet"] as Record<string, unknown> | null | undefined)?.["balance"];
    return {
      status,
      campaignId: typeof campaignId === "string" ? campaignId : null,
      reward,
      balance:
        typeof balance === "number" && Number.isInteger(balance) && balance >= 0 ? balance : null,
    };
  } catch {
    return null;
  }
}

export function createPushRewardClient(deps: PushRewardClientDeps): {
  readonly claim: (campaignId: string) => Promise<PushRewardClaim | null>;
} {
  return {
    claim: async (campaignId) => {
      try {
        const token = await deps.token();
        if (token === null) return null;
        const outcome = await deps.post((config) => ({
          url: `${config.url}/rest/v1/rpc/push_campaign_claim_reward`,
          init: {
            method: "POST",
            headers: bearerHeaders(config, token),
            body: JSON.stringify({ p_campaign_id: campaignId }),
          },
        }));
        return outcome.ok && isSuccessStatus(outcome.status)
          ? pushRewardClaimFrom(outcome.bodyText)
          : null;
      } catch {
        return null;
      }
    },
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과)에서만 부릅니다. */
export const pushRewardClient = () =>
  createPushRewardClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
