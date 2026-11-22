// 가입 보상 지급(ADR-0174) — RPC `companion_claim_signup_reward`를 부릅니다. 새 계정에 한 번, 서버가 주고 서버가 중복을 막습니다.
// **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

/** 이번 호출에서 더한 수(이미 받음 · 기존 회원이면 0)와 지갑 잔액. */
export type SignupRewardClaim = {
  readonly granted: number;
  readonly balance: number;
};

export type SignupRewardClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

export function signupRewardClaimFrom(bodyText: string | null): SignupRewardClaim | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as Record<string, unknown> | null;
    const wallet = raw?.wallet as Record<string, unknown> | null | undefined;
    const granted = count(raw?.granted);
    const balance = count(wallet?.balance);
    return granted === null || balance === null ? null : { granted, balance };
  } catch {
    return null;
  }
}

export function createSignupRewardClient(deps: SignupRewardClientDeps): {
  readonly claim: () => Promise<SignupRewardClaim | null>;
} {
  return {
    claim: async () => {
      try {
        const token = await deps.token();
        if (token === null) return null;
        const outcome = await deps.post((config) => ({
          url: `${config.url}/rest/v1/rpc/companion_claim_signup_reward`,
          init: { method: "POST", headers: bearerHeaders(config, token), body: "{}" },
        }));
        return outcome.ok && isSuccessStatus(outcome.status)
          ? signupRewardClaimFrom(outcome.bodyText)
          : null;
      } catch {
        return null;
      }
    },
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과)에서만 부릅니다. */
export const signupRewardClient = () =>
  createSignupRewardClient({
    token: () => currentAccessToken(),
    post: (build) => send(build, true),
  });
