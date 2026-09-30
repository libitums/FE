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
  userDevicesRequest,
} from "./push-devices.ts";
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

function devicesRequestFor(env: SendPushEnv, body: SendPushRequestBody): OutboundRequest {
  if (body.kind === "reengagement") return reengagementDevicesRequest(env, body.days);
  return body.audience === "all"
    ? allDevicesRequest(env)
    : userDevicesRequest(env, body.audience.userIds);
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
  const lookup = await send(deps, devicesRequestFor(env, body));
  if (lookup === null || lookup.status < 200 || lookup.status >= 300) {
    return { status: 502, error: "devices_unavailable" };
  }
  const devices = pushDevicesFrom(await lookup.text().catch(() => ""));
  if (devices === null) return { status: 502, error: "devices_unavailable" };
  if (devices.length === 0) {
    return { status: 200, summary: { devices: 0, sent: 0, failed: 0, removed: 0 } };
  }

  const authToken = await apnsAuthToken(env.apns, deps.nowMs(), deps.signEs256);
  if (authToken === null) return { status: 500, error: "server_misconfigured" };

  const results = await deliver(deps, env, authToken, devices, apnsPayload(messageFor(body)));
  const invalid = devices.filter((_, index) => results[index] === "invalid-token");
  let removed = 0;
  if (invalid.length > 0) {
    const removal = await send(
      deps,
      removeDevicesRequest(
        env,
        invalid.map((device) => device.token),
      ),
    );
    if (removal !== null && removal.status >= 200 && removal.status < 300) removed = invalid.length;
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
        if (token === null || !sameSecret(token, env.supabaseServiceRoleKey)) {
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
