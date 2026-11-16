// 자동 푸시 캠페인 — 서버에서 읽는 것(학습자 후보 RPC · 공개 버킷 level-5 콘텐츠)입니다(ADR-0130 D12).

import type { Outbound, OutboundRequest, OutboundResponse } from "./delete-account.contract.ts";
import type { CampaignLearner, CatalogEpisode, StoryUnits } from "./push-campaign-types.ts";
import { serviceKeyHeaders } from "./service-key.ts";

export type SourceEnv = { supabaseUrl: string; serviceKey: string };

export const call = async (
  outbound: Outbound,
  request: OutboundRequest,
): Promise<OutboundResponse | null> => {
  try {
    return await outbound(request);
  } catch {
    return null;
  }
};

export const ok = (response: OutboundResponse | null): response is OutboundResponse =>
  response !== null && response.status >= 200 && response.status < 300;

export const jsonOf = async (response: OutboundResponse): Promise<unknown> => {
  try {
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
};

type LearnerRow = {
  user_id: string;
  last_active_at: string;
  name: string | null;
  country_code: string | null;
  catalog_progress: Record<string, unknown> | null;
  tester: boolean;
  last_campaign_at: string | null;
};

/** 학습자 전부 — PostgREST 1,000행 상한을 넘게 나눠 읽습니다. 하나라도 실패하면 `null`. */
export async function loadLearners(outbound: Outbound, env: SourceEnv) {
  const rows: LearnerRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await call(outbound, {
      url: `${env.supabaseUrl}/rest/v1/rpc/push_campaign_learners?order=user_id&limit=1000&offset=${offset}`,
      method: "POST",
      headers: { ...serviceKeyHeaders(env.serviceKey), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!ok(response)) return null;
    const page = await jsonOf(response);
    if (!Array.isArray(page)) return null;
    rows.push(...(page as LearnerRow[]));
    if (page.length < 1000) break;
  }
  return rows
    .filter((row) => !row.tester)
    .map((row): CampaignLearner => ({
      userId: row.user_id,
      lastActiveMs: Date.parse(row.last_active_at),
      name: row.name ?? "",
      country: row.country_code,
      catalogProgress:
        row.catalog_progress && typeof row.catalog_progress === "object"
          ? row.catalog_progress
          : null,
      lastCampaignMs: row.last_campaign_at ? Date.parse(row.last_campaign_at) : null,
    }))
    .filter((learner) => Number.isFinite(learner.lastActiveMs));
}

type Content = {
  catalog: CatalogEpisode[];
  storyCatalog: CatalogEpisode[];
  storyUnits: StoryUnits;
};

let contentCache: { atMs: number; value: Content } | null = null;
const contentTtlMs = 30 * 60 * 1000;

/**
 * 공개 버킷의 level-5 매니페스트 · 에피소드(단계 · 이름 · 상대 인물)와 단계별 예고 파일입니다. 30분 붙잡아 둡니다.
 * 하나라도 못 읽으면 `null` — 반쯤 읽은 카탈로그로 사람을 잘못 가르지 않습니다.
 */
export async function loadContent(
  outbound: Outbound,
  supabaseUrl: string,
  nowMs: number,
): Promise<Content | null> {
  if (contentCache && nowMs - contentCache.atMs < contentTtlMs) return contentCache.value;
  const base = `${supabaseUrl}/storage/v1/object/public/content/`;
  const read = async (path: string): Promise<Record<string, unknown> | null> => {
    const response = await call(outbound, {
      url: `${base}${path}`,
      method: "GET",
      headers: {},
      body: null,
    });
    if (!ok(response)) return null;
    const value = await jsonOf(response);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  };
  const safe = (path: string) => /^[\w./-]+\.json$/.test(path) && !path.includes("..");

  const manifest = await read("manifests/level-5.json");
  const entries = Array.isArray(manifest?.episodes)
    ? (manifest.episodes as Record<string, unknown>[])
    : [];
  if (entries.length === 0) return null;
  const catalog: CatalogEpisode[] = [];
  for (const entry of [...entries].sort((a, b) => Number(a.order) - Number(b.order))) {
    const url = String(entry.url ?? "");
    if (!safe(url)) return null;
    const episode = await read(url);
    if (episode === null) return null;
    const steps = Array.isArray(episode.steps)
      ? (episode.steps as { id?: unknown }[]).map((step) => String(step?.id ?? "")).filter(Boolean)
      : [];
    catalog.push({
      id: String(entry.id),
      steps,
      title: String(episode.title_en ?? entry.id),
      character: typeof episode.counterpart === "string" ? episode.counterpart : "",
    });
  }

  const index = await read("push/level-5/index.json");
  const units = Array.isArray(index?.units) ? (index.units as Record<string, unknown>[]) : [];
  const storyUnits: StoryUnits = {};
  const storyCatalog: CatalogEpisode[] = [];
  for (const unit of units) {
    if (typeof unit?.unit !== "string") continue;
    const file =
      String(unit.url ?? `${unit.unit}.json`)
        .split("/")
        .pop() ?? "";
    if (!safe(file)) continue;
    const body = await read(`push/level-5/${file}`);
    if (body === null) return null;
    storyUnits[unit.unit] = body as StoryUnits[string];
    storyCatalog.push({
      id: unit.unit,
      steps: Array.isArray(unit.steps) ? unit.steps.map(String) : [],
      title: String(body.title_en ?? unit.unit),
      character: "",
    });
  }
  const value = { catalog, storyCatalog, storyUnits };
  contentCache = { atMs: nowMs, value };
  return value;
}

/** 테스트에서 캐시를 비웁니다. */
export const resetContentCache = () => {
  contentCache = null;
};
