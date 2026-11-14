// 연속 학습 보상 지급(ADR-0143) — RPC `companion_claim_streak_reward(p_today)`를 부릅니다. 연속 일수는 서버가 학습한 날 표로 셉니다.
// **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import type { LocalDay } from "./learning-progress.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

/** 서버가 센 연속 일수 · 그 이정표 액수(아니면 0) · 이번 호출에서 더했는지 · 지갑 잔액. */
export type StreakRewardClaim = {
  readonly days: number;
  readonly amount: number;
  readonly granted: boolean;
  readonly balance: number;
};

export type StreakRewardClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

export function streakRewardClaimFrom(bodyText: string | null): StreakRewardClaim | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    const wallet = raw?.wallet as Record<string, unknown> | null | undefined;
    const days = count(raw?.days);
    const amount = count(raw?.amount);
    const granted = raw?.granted;
    const balance = count(wallet?.balance);
    return days === null || amount === null || typeof granted !== "boolean" || balance === null
      ? null
      : { days, amount, granted, balance };
  } catch {
    return null;
  }
}

export function createStreakRewardClient(deps: StreakRewardClientDeps): {
  readonly claim: (today: LocalDay) => Promise<StreakRewardClaim | null>;
} {
  return {
    claim: async (today) => {
      try {
        const token = await deps.token();
        if (token === null) return null;
        const outcome = await deps.post((config) => ({
          url: `${config.url}/rest/v1/rpc/companion_claim_streak_reward`,
          init: {
            method: "POST",
            headers: bearerHeaders(config, token),
            body: JSON.stringify({ p_today: today }),
          },
        }));
        return outcome.ok && isSuccessStatus(outcome.status)
          ? streakRewardClaimFrom(outcome.bodyText)
          : null;
      } catch {
        return null;
      }
    },
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과 · 핸들러)에서만 부릅니다. */
export const streakRewardClient = () =>
  createStreakRewardClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
