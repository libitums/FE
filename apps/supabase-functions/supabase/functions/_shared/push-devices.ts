import type { OutboundRequest } from "./delete-account.contract.ts";
import { serviceKeyHeaders } from "./service-key.ts";
import type {
  PushDevice,
  PushDevicesFrom,
  ReengagementDays,
  SendPushEnv,
} from "./send-push.contract.ts";

// `push_devices` 표를 service role로 읽고 지웁니다(PostgREST). 표는 RLS가 켜져 있고 정책이 없어 이 키로만
// 닿습니다(마이그레이션 `20260930120000_push_devices.sql`).

const headers = (env: SendPushEnv): Record<string, string> => ({
  ...serviceKeyHeaders(env.supabaseServiceRoleKey),
  "Content-Type": "application/json",
});

/**
 * 호출자가 내민 키가 **서버 키인지** Supabase Auth에 묻습니다 — 관리자 사용자 목록은 서버 키(레거시 JWT ·
 * `sb_secret_…` 어느 쪽이든)에만 200을 줍니다. 호출자의 키가 런타임의 키와 형식이 달라도 통과시키려는 것입니다.
 */
export function serviceKeyCheckRequest(env: SendPushEnv, presentedKey: string): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`,
    method: "GET",
    headers: serviceKeyHeaders(presentedKey),
    body: null,
  };
}

export function allDevicesRequest(env: SendPushEnv): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/rest/v1/push_devices?select=token,environment`,
    method: "GET",
    headers: headers(env),
    body: null,
  };
}

export function userDevicesRequest(env: SendPushEnv, userIds: readonly string[]): OutboundRequest {
  const list = userIds.map((id) => encodeURIComponent(id)).join(",");
  return {
    url: `${env.supabaseUrl}/rest/v1/push_devices?select=token,environment&user_id=in.(${list})`,
    method: "GET",
    headers: headers(env),
    body: null,
  };
}

export function reengagementDevicesRequest(
  env: SendPushEnv,
  days: ReengagementDays,
): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/rest/v1/rpc/reengagement_devices`,
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({ p_days: days }),
  };
}

export function removeDevicesRequest(env: SendPushEnv, tokens: readonly string[]): OutboundRequest {
  return {
    url: `${env.supabaseUrl}/rest/v1/push_devices?token=in.(${tokens.join(",")})`,
    method: "DELETE",
    headers: headers(env),
    body: null,
  };
}

const tokenPattern = /^[0-9a-f]{64,200}$/;

export const pushDevicesFrom: PushDevicesFrom = (bodyText) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const devices: PushDevice[] = [];
  for (const row of parsed) {
    if (typeof row !== "object" || row === null) continue;
    const { token, environment } = row as Record<string, unknown>;
    if (typeof token !== "string" || !tokenPattern.test(token)) continue;
    if (environment !== "sandbox" && environment !== "production") continue;
    devices.push({ token, environment });
  }
  return devices;
};
