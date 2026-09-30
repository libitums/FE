import {
  apnsAuthToken,
  apnsConcurrency,
  apnsPayload,
  apnsRequest,
  apnsResultFrom,
} from "./apns.ts";
import type { OutboundRequest, OutboundResponse } from "./delete-account.contract.ts";
import {
  allDevicesRequest,
  pushDevicesFrom,
  reengagementDevicesRequest,
  removeDevicesRequest,
  serviceKeyCheckRequest,
  userDevicesRequest,
} from "./push-devices.ts";
import { isJwtShaped } from "./service-key.ts";
import { reengagementMessageFor, sendPushBodyFrom } from "./send-push-body.ts";
import type {
  ApnsResult,
  CreateSendPushHandler,
  PushDevice,
  PushMessage,
  SendPushDeps,
  SendPushEnv,
  SendPushOutcome,
  SendPushRequestBody,
} from "./send-push.contract.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

const send = async (
  deps: SendPushDeps,
  request: OutboundRequest,
): Promise<OutboundResponse | null> => {
  try {
    return await deps.outbound(request);
  } catch {
    return null;
  }
};

/** 길이가 같을 때만 글자를 다 비교합니다 — 첫 차이에서 멈추지 않습니다. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/**
 * 호출자가 서버 키를 냈는가. 런타임의 키와 글자가 같으면 곧바로 통과, 아니면 Auth에 물어 200이면 통과입니다
 * (예약 작업이 Vault의 레거시 키를, 런타임이 새 비밀 키를 들고 있을 수 있습니다).
 */
async function isServiceCaller(
  deps: SendPushDeps,
  env: SendPushEnv,
  presentedKey: string,
): Promise<boolean> {
  if (sameSecret(presentedKey, env.supabaseServiceRoleKey)) return true;
  // 형식 검사는 불필요한 조회만 줄입니다. 권한은 아래 Auth 응답으로 확인합니다.
  const secretShaped = presentedKey.startsWith("sb_secret_") && presentedKey.length > 10;
  if (!isJwtShaped(presentedKey) && !secretShaped) return false;
  const response = await send(deps, serviceKeyCheckRequest(env, presentedKey));
  return response !== null && response.status === 200;
}

/** 쿼리 문자열에 싣는 ID · 토큰 수의 상한입니다 — URL 길이 제한(414)을 넘지 않게 나눕니다. */
export const userIdsPerLookup = 100;
export const tokensPerRemoval = 50;

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

function devicesRequestsFor(env: SendPushEnv, body: SendPushRequestBody): OutboundRequest[] {
  if (body.kind === "reengagement") return [reengagementDevicesRequest(env, body.days)];
  if (body.audience === "all") return [allDevicesRequest(env)];
  return chunks(body.audience.userIds, userIdsPerLookup).map((ids) => userDevicesRequest(env, ids));
}

/** 조회가 하나라도 실패하면 `null` — 일부 대상에게만 보내지 않습니다. */
async function lookupDevices(
  deps: SendPushDeps,
  requests: readonly OutboundRequest[],
): Promise<PushDevice[] | null> {
  const pages = await Promise.all(
    requests.map(async (request) => {
      const response = await send(deps, request);
      if (response === null || response.status < 200 || response.status >= 300) return null;
      return pushDevicesFrom(await response.text().catch(() => ""));
    }),
  );
  if (pages.some((page) => page === null)) return null;
  const byToken = new Map<string, PushDevice>();
  for (const page of pages) for (const device of page ?? []) byToken.set(device.token, device);
  return [...byToken.values()];
}

function messageFor(body: SendPushRequestBody): PushMessage {
  if (body.kind === "reengagement") return reengagementMessageFor(body.days);
  return { title: body.title, body: body.body, target: body.target ?? { kind: "journey-map" } };
}

async function deliver(
  deps: SendPushDeps,
  env: SendPushEnv,
  authToken: string,
  devices: readonly PushDevice[],
  payload: string,
): Promise<ApnsResult[]> {
  const results: ApnsResult[] = [];
  for (let start = 0; start < devices.length; start += apnsConcurrency) {
    const batch = devices.slice(start, start + apnsConcurrency);
    const settled = await Promise.all(
      batch.map(async (device) => {
        const response = await send(deps, apnsRequest(env.apns, authToken, device, payload));
        if (response === null) return "failed" as const;
        return apnsResultFrom(response.status, await response.text().catch(() => ""));
      }),
    );
    results.push(...settled);
  }
  return results;
}

async function decide(
  deps: SendPushDeps,
  env: SendPushEnv,
  body: SendPushRequestBody,
): Promise<SendPushOutcome> {
  const devices = await lookupDevices(deps, devicesRequestsFor(env, body));
  if (devices === null) return { status: 502, error: "devices_unavailable" };
  if (devices.length === 0) {
    return { status: 200, summary: { devices: 0, sent: 0, failed: 0, removed: 0 } };
  }

  const authToken = await apnsAuthToken(env.apns, deps.nowMs(), deps.signEs256);
  if (authToken === null) return { status: 500, error: "server_misconfigured" };

  const results = await deliver(deps, env, authToken, devices, apnsPayload(messageFor(body)));
  const invalid = devices.filter((_, index) => results[index] === "invalid-token");
  let removed = 0;
  for (const batch of chunks(invalid, tokensPerRemoval)) {
    const removal = await send(
      deps,
      removeDevicesRequest(
        env,
        batch.map((device) => device.token),
      ),
    );
    if (removal !== null && removal.status >= 200 && removal.status < 300) removed += batch.length;
  }
  return {
    status: 200,
    summary: {
      devices: devices.length,
      sent: results.filter((result) => result === "sent").length,
      failed: results.filter((result) => result !== "sent").length,
      removed,
    },
  };
}

function responseFor(outcome: SendPushOutcome): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (outcome.status === 405) headers["Allow"] = "POST";
  const payload = outcome.status === 200 ? outcome.summary : { error: outcome.error };
  return new Response(JSON.stringify(payload), { status: outcome.status, headers });
}

export const createSendPushHandler: CreateSendPushHandler = (deps) => {
  return async (request) => {
    let outcome: SendPushOutcome;
    let kind: SendPushRequestBody["kind"] | null = null;
    try {
      const env = deps.env;
      if (request.method !== "POST") outcome = { status: 405, error: "method_not_allowed" };
      else if (env === null) outcome = { status: 500, error: "server_misconfigured" };
      else {
        const token = bearerTokenFrom(request.headers.get("Authorization"));
        if (token === null || !(await isServiceCaller(deps, env, token))) {
          outcome = { status: 401, error: "unauthorized" };
        } else {
          const body = sendPushBodyFrom(await request.text().catch(() => ""));
          if (body === null) outcome = { status: 400, error: "invalid_body" };
          else {
            kind = body.kind;
            outcome = await decide(deps, env, body);
          }
        }
      }
    } catch {
      outcome = { status: 500, error: "server_misconfigured" };
    }
    deps.log({
      event: "send-push",
      status: outcome.status,
      kind,
      summary: outcome.status === 200 ? outcome.summary : null,
    });
    return responseFor(outcome);
  };
};
