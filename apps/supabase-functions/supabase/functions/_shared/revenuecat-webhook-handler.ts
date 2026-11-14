// RevenueCat 웹훅 처리기(ADR-0144) — 인증 헤더 → 본문 정규화 → (샌드박스 거름) → DB RPC 한 번.
// 2xx가 아니면 RevenueCat이 다시 보냅니다 — DB 실패만 500으로 돌려 재시도를 받고, 받을 수 없는 본문(400) · 인증 실패(401)는
// 다시 보내도 같으므로 재시도 대상이 아닙니다. 같은 이벤트의 재전송은 DB가 이벤트 id로 거릅니다(`duplicate`).

import { revenuecatEventFrom } from "./revenuecat-event.ts";
import type {
  CreateRevenuecatWebhookHandler,
  RevenuecatWebhookLogEntry,
} from "./revenuecat-webhook.contract.ts";
import { serviceKeyHeaders } from "./service-key.ts";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * 두 값을 SHA-256으로 줄인 뒤 32바이트를 모두 견줍니다 — 길이가 달라도 먼저 끝나지 않아 시간으로 값도 길이도 새지 않습니다
 * (리뷰 #434).
 */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(given)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < right.length; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

export const createRevenuecatWebhookHandler: CreateRevenuecatWebhookHandler =
  ({ env, outbound, log }) =>
  async (request) => {
    const done = (
      status: number,
      outcome: string,
      extra: Partial<RevenuecatWebhookLogEntry> = {},
    ) => {
      log({ event: "revenuecat_webhook", status, outcome, ...extra });
      return status === 405
        ? new Response(null, { status, headers: { Allow: "POST" } })
        : json(status, status === 200 ? { outcome } : { error: outcome });
    };
    if (env === null) return done(500, "misconfigured");
    if (request.method !== "POST") return done(405, "method_not_allowed");
    if (!(await sameSecret(request.headers.get("Authorization") ?? "", env.webhookAuth))) {
      return done(401, "unauthorized");
    }
    let body: unknown;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return done(400, "invalid_body");
    }
    const event = revenuecatEventFrom(body);
    if (event === null) return done(400, "invalid_body");
    const tags = { type: event.type, environment: event.environment };
    if (event.environment === "sandbox" && !env.acceptSandbox) {
      return done(200, "sandbox_ignored", tags);
    }
    try {
      const response = await outbound({
        url: `${env.supabaseUrl}/rest/v1/rpc/companion_apply_store_event`,
        method: "POST",
        headers: {
          ...serviceKeyHeaders(env.supabaseServiceRoleKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_event: event }),
      });
      if (response.status < 200 || response.status >= 300) return done(500, "db_failed", tags);
      const result = JSON.parse(await response.text()) as { outcome?: unknown } | null;
      return done(200, typeof result?.outcome === "string" ? result.outcome : "applied", tags);
    } catch {
      return done(500, "db_failed", tags);
    }
  };
