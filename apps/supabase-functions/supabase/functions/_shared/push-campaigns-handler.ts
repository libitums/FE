// 자동 푸시 캠페인 함수(ADR-0130 D12). 매시 예약 작업이 서버 키로 부릅니다.
// 순서: 메서드(405) → 환경(500) → Bearer = 서버 키(401) → 학습자 · 콘텐츠 읽기(502) → 계획 →
// (dryRun이면 요약만 200) → 배정 기록(502, 실패하면 보내지 않음) → `send-push` announcement 묶음 발송 → 200.

import type { Outbound } from "./delete-account.contract.ts";
import { call, jsonOf, loadContent, loadLearners, ok } from "./push-campaigns-sources.ts";

export { resetContentCache } from "./push-campaigns-sources.ts";
import {
  batchesOf,
  type CampaignConfig,
  planCampaign,
  type PlannedRow,
} from "./push-campaign-plan.ts";
import { isJwtShaped, serviceKeyHeaders } from "./service-key.ts";
import { bearerTokenFrom } from "./supabase-auth.ts";

export type PushCampaignsEnv = { supabaseUrl: string; serviceKey: string };

export type PushCampaignsLog = {
  event: "push-campaigns";
  status: number;
  dryRun: boolean;
  learners: number | null;
  sent: number | null;
  control: number | null;
  delivery: { calls: number; failedCalls: number; devices: number; delivered: number } | null;
  error: string | null;
};

export type PushCampaignsDeps = {
  env: PushCampaignsEnv | null;
  /** 짧은 조회용(10초). */
  outbound: Outbound;
  /** `send-push` 호출용(긴 제한 시간). */
  sendOutbound: Outbound;
  config: CampaignConfig;
  nowMs: () => number;
  log: (entry: PushCampaignsLog) => void;
};

export function pushCampaignsEnvFrom(
  read: (name: string) => string | undefined,
): PushCampaignsEnv | null {
  const url = read("SUPABASE_URL")?.trim() ?? "";
  const serviceKey = read("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!url.startsWith("https://") || serviceKey === "") return null;
  return { supabaseUrl: url.replace(/\/+$/, ""), serviceKey };
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** send-push와 같은 확인 — 런타임 키와 같거나, Auth 관리자 목록이 200을 주는 서버 키입니다. */
async function isServiceCaller(deps: PushCampaignsDeps, env: PushCampaignsEnv, key: string) {
  if (sameSecret(key, env.serviceKey)) return true;
  const secretShaped = key.startsWith("sb_secret_") && key.length > 10;
  if (!isJwtShaped(key) && !secretShaped) return false;
  const response = await call(deps.outbound, {
    url: `${env.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`,
    method: "GET",
    headers: serviceKeyHeaders(key),
    body: null,
  });
  return response?.status === 200;
}

function summary(rows: readonly PlannedRow[]) {
  const bySegment: Record<string, { sent: number; control: number; a: number; b: number }> = {};
  for (const row of rows) {
    const entry = (bySegment[row.segment] ??= { sent: 0, control: 0, a: 0, b: 0 });
    entry[row.group] += 1;
    if (row.variant) entry[row.variant] += 1;
  }
  return bySegment;
}

const respond = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...(status === 405 ? { Allow: "POST" } : {}) },
  });

export function createPushCampaignsHandler(deps: PushCampaignsDeps) {
  return async (request: Request): Promise<Response> => {
    const log: PushCampaignsLog = {
      event: "push-campaigns",
      status: 500,
      dryRun: false,
      learners: null,
      sent: null,
      control: null,
      delivery: null,
      error: null,
    };
    const finish = (status: number, payload: unknown) => {
      log.status = status;
      deps.log(log);
      return respond(status, payload);
    };
    try {
      if (request.method !== "POST") return finish(405, { error: "method_not_allowed" });
      const env = deps.env;
      if (env === null) return finish(500, { error: "server_misconfigured" });
      const token = bearerTokenFrom(request.headers.get("Authorization"));
      if (token === null || !(await isServiceCaller(deps, env, token)))
        return finish(401, { error: "unauthorized" });

      const input = (await request.json().catch(() => ({}))) as {
        dryRun?: unknown;
        atMs?: unknown;
      };
      const dryRun = input?.dryRun === true;
      log.dryRun = dryRun;
      // 시각 바꾸기는 미리보기에서만 받습니다(발송은 언제나 지금).
      const nowMs =
        dryRun && typeof input.atMs === "number" && Number.isFinite(input.atMs)
          ? input.atMs
          : deps.nowMs();

      const [learners, content] = await Promise.all([
        loadLearners(deps.outbound, env),
        loadContent(deps.outbound, env.supabaseUrl, deps.nowMs()),
      ]);
      if (learners === null) return finish(502, { error: "learners_unavailable" });
      if (content === null) return finish(502, { error: "content_unavailable" });
      log.learners = learners.length;

      const { rows, skipped } = planCampaign({ learners, ...content, config: deps.config, nowMs });
      const sentRows = rows.filter((row) => row.group === "sent");
      log.sent = sentRows.length;
      log.control = rows.length - sentRows.length;
      const result = {
        runAt: new Date(nowMs).toISOString(),
        learners: learners.length,
        sent: log.sent,
        control: log.control,
        bySegment: summary(rows),
        skipped,
      };
      if (dryRun) {
        return finish(200, {
          ...result,
          dryRun: true,
          samples: sentRows
            .slice(0, 12)
            .map(({ segment, variant, lang, storyStep, title, body }) => ({
              segment,
              variant,
              lang,
              storyStep,
              title,
              body,
            })),
        });
      }
      if (rows.length === 0) return finish(200, { ...result, delivery: null });

      // 배정을 먼저 남깁니다 — 기록 없이 나간 알림은 결과에서 셀 수 없어 보내지 않습니다.
      const runAt = new Date(nowMs).toISOString();
      for (let start = 0; start < rows.length; start += 500) {
        const response = await call(deps.outbound, {
          url: `${env.supabaseUrl}/rest/v1/push_campaign_sends`,
          method: "POST",
          headers: {
            ...serviceKeyHeaders(env.serviceKey),
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(
            rows.slice(start, start + 500).map((row) => ({
              run_at: runAt,
              series: row.series,
              segment: row.segment,
              user_id: row.userId,
              group: row.group,
              variant: row.variant,
              lang: row.lang,
              story_step: row.storyStep,
              title: row.title,
              body: row.body,
            })),
          ),
        });
        if (!ok(response)) {
          log.error = `record_failed_at_${start}`;
          return finish(502, { error: "record_failed", recordedBefore: start });
        }
      }

      const delivery = { calls: 0, failedCalls: 0, devices: 0, delivered: 0 };
      const batches = batchesOf(rows);
      let next = 0;
      const worker = async () => {
        while (next < batches.length) {
          const batch = batches[next++]!;
          delivery.calls += 1;
          const response = await call(deps.sendOutbound, {
            url: `${env.supabaseUrl}/functions/v1/send-push`,
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              kind: "announcement",
              audience: { userIds: batch.userIds },
              title: batch.title,
              body: batch.body,
              target: null,
            }),
          });
          const payload = ok(response)
            ? ((await jsonOf(response)) as Record<string, unknown> | null)
            : null;
          if (payload === null) {
            delivery.failedCalls += 1;
            continue;
          }
          delivery.devices += Number(payload.devices ?? 0);
          delivery.delivered += Number(payload.sent ?? 0);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, batches.length) }, worker));
      log.delivery = delivery;
      return finish(200, { ...result, delivery });
    } catch (error) {
      log.error = error instanceof Error ? error.name : "unknown";
      return finish(500, { error: "server_error" });
    }
  };
}
