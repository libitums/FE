// AdMob SSV 콜백 처리기(ADR-0208) — 쿼리 → 공개키 → 서명 확인 → DB RPC 한 번(`public.ad_ticket_grant`).
// 2xx가 아니면 Google이 다시 보낸다 — 다시 보내 나아질 수 있는 실패(환경 · 키 목록 · DB)만 500이고, 위조(401) · 모양(400) ·
// 받지 않는 광고 단위(403)는 다시 보내도 같다. DB가 판정한 거절(상한 · 중복 · 대상 아님 · 스위치 off)은 200이다.

import { parseAdmobSsvQuery, verifyAdmobSignature } from "./admob-ssv.ts";
import type { CreateAdmobSsvHandler } from "./admob-ssv.contract.ts";
import { serviceKeyHeaders } from "./service-key.ts";

const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const createAdmobSsvHandler: CreateAdmobSsvHandler =
  ({ env, outbound, keys, log }) =>
  async (request) => {
    const done = (status: number, outcome: string) => {
      log({ event: "admob_ssv", status, outcome });
      return status === 405
        ? new Response(null, { status, headers: { Allow: "GET" } })
        : json(status, status === 200 ? { outcome } : { error: outcome });
    };
    if (env === null) return done(500, "misconfigured");
    if (request.method !== "GET") return done(405, "method_not_allowed");
    const url = new URL(request.url);
    const query = parseAdmobSsvQuery(url.search.replace(/^\?/, ""));
    if (
      query === null ||
      !uuidShape.test(query.customData) ||
      !uuidShape.test(query.userId) ||
      query.transactionId.length > 200 ||
      query.adUnit.length > 200
    ) {
      return done(400, "invalid_query");
    }
    let publicKey: string | null;
    try {
      publicKey = await keys.keyFor(query.keyId);
    } catch {
      return done(500, "keys_failed");
    }
    // 모르는 key_id는 키 교체 직후일 수 있다 — 다시 받도록 500. 서명이 틀린 것만 401(다시 보내도 같다).
    if (publicKey === null) return done(500, "unknown_key");
    if (!(await verifyAdmobSignature(query.signedContent, query.signature, publicKey))) {
      return done(401, "bad_signature");
    }
    if (!env.adUnitIds.includes(query.adUnit)) {
      return done(403, "ad_unit_not_allowed");
    }
    try {
      const response = await outbound({
        url: `${env.supabaseUrl}/rest/v1/rpc/ad_ticket_grant`,
        method: "POST",
        headers: {
          ...serviceKeyHeaders(env.supabaseServiceRoleKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_user_id: query.userId.toLowerCase(),
          p_request_id: query.customData.toLowerCase(),
          p_transaction_id: query.transactionId,
          p_ad_unit: query.adUnit,
        }),
      });
      if (response.status < 200 || response.status >= 300) return done(500, "db_failed");
      const result = JSON.parse(await response.text()) as { outcome?: unknown } | null;
      return done(200, typeof result?.outcome === "string" ? result.outcome : "unknown");
    } catch {
      return done(500, "db_failed");
    }
  };
