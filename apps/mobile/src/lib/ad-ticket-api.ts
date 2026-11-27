// 광고 보고 티켓 서버 RPC(ADR-0208) — `ad_ticket_status`(스위치 · 대상 · 오늘 남은 횟수 · 요청 지급 상태)와
// `ad_ticket_start`(SSV custom_data에 실을 요청 id 발급). 하루의 기준은 기기 UTC 오프셋(분)입니다.
// **던지지 않습니다** — 로그인이 없거나 실패 · 틀린 응답은 null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import type { AdTicketServerStatus, AdTicketStart } from "./ad-ticket.contract";
import { currentAccessToken } from "./progress-api";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";

export type AdTicketClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

export type AdTicketClient = {
  readonly status: (utcOffset: number, requestId?: string) => Promise<AdTicketServerStatus | null>;
  readonly start: (utcOffset: number) => Promise<AdTicketStart | null>;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

function parse(bodyText: string | null): Record<string, unknown> | null {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    const raw = JSON.parse(bodyText) as unknown;
    return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const requestStatuses = ["pending", "granted", "rejected"] as const;

export function adTicketStatusFrom(bodyText: string | null): AdTicketServerStatus | null {
  const raw = parse(bodyText);
  const cap = count(raw?.cap);
  const left = count(raw?.left);
  if (
    raw === null ||
    typeof raw.enabled !== "boolean" ||
    typeof raw.eligible !== "boolean" ||
    cap === null ||
    left === null
  ) {
    return null;
  }
  let request: AdTicketServerStatus["request"] = null;
  if (raw.request !== null && raw.request !== undefined) {
    const value = raw.request as Record<string, unknown>;
    const status = requestStatuses.find((name) => name === value.status);
    if (status === undefined) return null;
    request = { status, reason: typeof value.reason === "string" ? value.reason : null };
  }
  return { enabled: raw.enabled, eligible: raw.eligible, cap, left, request };
}

export function adTicketStartFrom(bodyText: string | null): AdTicketStart | null {
  const raw = parse(bodyText);
  const cap = count(raw?.cap);
  const left = count(raw?.left);
  if (raw === null || cap === null || left === null) return null;
  if (raw.result === "ok") {
    return typeof raw.requestId === "string" && raw.requestId !== ""
      ? { result: "ok", requestId: raw.requestId, left, cap }
      : null;
  }
  if (raw.result === "blocked" || raw.result === "limit") return { result: raw.result, left, cap };
  return null;
}

export function createAdTicketClient(deps: AdTicketClientDeps): AdTicketClient {
  async function rpc<T>(
    name: string,
    body: Record<string, unknown>,
    read: (text: string | null) => T | null,
  ): Promise<T | null> {
    try {
      const token = await deps.token();
      if (token === null) return null;
      const outcome = await deps.post((config) => ({
        url: `${config.url}/rest/v1/rpc/${name}`,
        init: { method: "POST", headers: bearerHeaders(config, token), body: JSON.stringify(body) },
      }));
      return outcome.ok && isSuccessStatus(outcome.status) ? read(outcome.bodyText) : null;
    } catch {
      return null;
    }
  }
  return {
    status: (utcOffset, requestId) =>
      rpc(
        "ad_ticket_status",
        { p_utc_offset_min: utcOffset, p_request_id: requestId ?? null },
        adTicketStatusFrom,
      ),
    start: (utcOffset) =>
      rpc("ad_ticket_start", { p_utc_offset_min: utcOffset }, adTicketStartFrom),
  };
}

/** 앱 결선 — 저장된 로그인 · 설정. background 스레드(효과 · 탭)에서만 부릅니다. */
export const adTicketClient = (): AdTicketClient =>
  createAdTicketClient({ token: () => currentAccessToken(), post: (build) => send(build, true) });
