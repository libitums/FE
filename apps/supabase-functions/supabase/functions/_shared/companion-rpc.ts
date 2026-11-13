// `chat-send`가 DB에 닿는 길: 서버 키로 `public.companion_*` 서버용 함수를 HTTP RPC로 부릅니다(ADR-0133).
// DB에 직접 연결하지 않습니다.

import type { ChatSendEnv } from "./chat-send.contract.ts";
import type { Outbound, OutboundRequest } from "./delete-account.contract.ts";
import { isJwtShaped, serviceKeyHeaders } from "./service-key.ts";

/** RPC · 인증 조회에 필요한 환경 칸만. `ChatSendEnv`도 이 모양을 품는다(스냅샷 · 음성의 `MediaEnv`도). */
export type RpcEnv = Pick<
  ChatSendEnv,
  "supabaseUrl" | "supabaseAnonKey" | "supabaseServiceRoleKey"
>;

export class RpcFailed extends Error {
  constructor(
    readonly fn: string,
    readonly status: number | null,
  ) {
    super(`rpc ${fn} failed (${status ?? "network"})`);
  }
}

export function rpcRequest(
  env: RpcEnv,
  fn: string,
  args: Record<string, unknown>,
): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/rest/v1/rpc/${fn}`,
    method: "POST",
    headers: {
      ...serviceKeyHeaders(env.supabaseServiceRoleKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  };
}

/** 2xx면 본문 JSON(빈 본문은 null), 아니면 `RpcFailed`. */
export async function callRpc<T>(
  outbound: Outbound,
  env: RpcEnv,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  let response;
  try {
    response = await outbound(rpcRequest(env, fn, args));
  } catch {
    throw new RpcFailed(fn, null);
  }
  if (response.status < 200 || response.status >= 300) throw new RpcFailed(fn, response.status);
  const text = await response.text();
  return (text === "" ? null : JSON.parse(text)) as T;
}

/** `GET {url}/auth/v1/user` — 사용자 토큰이 유효하면 사용자 id. */
export function authUserIdRequest(env: RpcEnv, accessToken: string): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/auth/v1/user`,
    method: "GET",
    headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    body: null,
  };
}

/** 길이가 같을 때만 글자를 다 비교합니다 — 첫 차이에서 멈추지 않습니다. */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/**
 * 호출자가 이 프로젝트의 서버 키를 냈는가(ops-dashboard · 예약 작업). 런타임 키와 글자가 같으면 통과, 아니면 Auth 관리 API에 그 키로
 * 물어 200이면 통과합니다 — 런타임은 새 비밀 키(`sb_secret_…`)를, 호출자는 레거시 `service_role` 키를 들고 있을 수 있습니다
 * (`send-push`와 같은 규칙, 2026-11-09 운영에서 확인).
 */
export async function isServiceKey(
  outbound: Outbound,
  env: RpcEnv,
  presented: string,
): Promise<boolean> {
  if (sameSecret(presented, env.supabaseServiceRoleKey)) return true;
  // 형식 검사는 불필요한 조회만 줄입니다. 권한은 아래 Auth 응답으로 확인합니다.
  if (!isJwtShaped(presented) && !(presented.startsWith("sb_secret_") && presented.length > 10))
    return false;
  try {
    const response = await outbound({
      url: `${env.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`,
      method: "GET",
      headers: serviceKeyHeaders(presented),
      body: null,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
