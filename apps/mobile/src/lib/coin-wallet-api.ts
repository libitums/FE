// 엽전 서버 지갑(ADR-0140) — 학습 보상 · 출시 보너스 한 번 지급 RPC `companion_claim_coins`를 부릅니다.
// **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

/** 한 번 지급의 결과 — 이번 호출에서 더한 학습 보상 · 보너스와 지갑 잔액. */
export type CoinClaim = {
  readonly learning: number;
  readonly bonus: number;
  readonly balance: number;
};

export type CoinClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

export function coinClaimFrom(bodyText: string | null): CoinClaim | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    const wallet = raw?.wallet as Record<string, unknown> | null | undefined;
    const learning = count(raw?.learning);
    const bonus = count(raw?.bonus);
    const balance = count(wallet?.balance);
    return learning === null || bonus === null || balance === null
      ? null
      : { learning, bonus, balance };
  } catch {
    return null;
  }
}

export function createCoinClient(deps: CoinClientDeps): {
  readonly claim: () => Promise<CoinClaim | null>;
} {
  return {
    claim: async () => {
      try {
        const token = await deps.token();
        if (token === null) return null;
        const outcome = await deps.post((config) => ({
          url: `${config.url}/rest/v1/rpc/companion_claim_coins`,
          init: { method: "POST", headers: bearerHeaders(config, token), body: "{}" },
        }));
        return outcome.ok && isSuccessStatus(outcome.status)
          ? coinClaimFrom(outcome.bodyText)
          : null;
      } catch {
        return null;
      }
    },
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과)에서만 부릅니다. */
export const coinClient = () =>
  createCoinClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
