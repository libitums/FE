// `chat-send`가 DB에 닿는 길: 서버 키로 `public.companion_*` 서버용 함수를 HTTP RPC로 부릅니다(ADR-0114).
// DB에 직접 연결하지 않습니다.

import type { ChatSendEnv } from "./chat-send.contract.ts";
import type { Outbound, OutboundRequest } from "./delete-account.contract.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export class RpcFailed extends Error {
  constructor(
    readonly fn: string,
    readonly status: number | null,
  ) {
    super(`rpc ${fn} failed (${status ?? "network"})`);
  }
}

export function rpcRequest(
  env: ChatSendEnv,
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
  env: ChatSendEnv,
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
export function authUserIdRequest(env: ChatSendEnv, accessToken: string): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/auth/v1/user`,
    method: "GET",
    headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
    body: null,
  };
}
