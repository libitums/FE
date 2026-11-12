// 푸시 콘솔의 바깥 경계입니다 — 설정 · Supabase(REST · Auth 관리 · send-push) · PostHog · 캠페인 기록 파일.
// 서비스 키는 실행할 때마다 Supabase CLI에서 받고, 어디에도 쓰지 않습니다.

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 기록 · 설정 폴더입니다. 저장소 밖이라 워크트리가 달라도 같은 기록을 봅니다. */
export const storeDir = () =>
  process.env.PUSH_CONSOLE_DIR || path.join(homedir(), ".duru", "push-console");

/**
 * 설정 — 환경 변수가 `config.json`보다 앞섭니다.
 * `supabaseProjectRef`(필수) · `posthogProjectId` · `posthogHost` · `posthogPersonalApiKey`(선택).
 */
export function loadConfig() {
  let file = {};
  try {
    file = JSON.parse(readFileSync(path.join(storeDir(), "config.json"), "utf8"));
  } catch {
    file = {};
  }
  return {
    supabaseProjectRef: process.env.SUPABASE_PROJECT_REF || file.supabaseProjectRef || null,
    posthogProjectId: process.env.POSTHOG_PROJECT_ID || file.posthogProjectId || null,
    posthogHost: process.env.POSTHOG_HOST || file.posthogHost || "https://us.posthog.com",
    posthogPersonalApiKey:
      process.env.POSTHOG_PERSONAL_API_KEY || file.posthogPersonalApiKey || null,
  };
}

/** 출력에서 첫 JSON 배열을 꺼냅니다 — CLI가 JSON 뒤에 업데이트 안내를 덧붙여도 읽습니다. */
export function firstJsonArray(text) {
  const start = text.indexOf("[");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }
  return null;
}

/** service role 키 —`SUPABASE_SERVICE_ROLE_KEY`가 있으면 그것, 없으면 `supabase projects api-keys`. */
export function serviceRoleKey(projectRef) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  // CLI가 실행 폴더에 `supabase/.temp`를 만듭니다 — 저장소가 아니라 기록 폴더에서 돌립니다.
  mkdirSync(storeDir(), { recursive: true });
  const output = execFileSync(
    "supabase",
    ["projects", "api-keys", "--project-ref", projectRef, "-o", "json"],
    {
      cwd: storeDir(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  const keys = firstJsonArray(output);
  const legacy = keys?.find((key) => key.name === "service_role");
  if (!legacy?.api_key)
    throw new Error("service_role 키를 찾지 못했습니다 — supabase login 상태를 확인하세요.");
  return legacy.api_key;
}

/** Supabase 연결입니다. */
export function supabaseClient({ projectRef, key, fetchImpl = fetch }) {
  const base = `https://${projectRef}.supabase.co`;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  /** PostgREST 표를 1,000행씩 끝까지 읽습니다. */
  async function selectAll(table, query) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const url = `${base}/rest/v1/${table}?${query}&limit=1000&offset=${offset}`;
      const response = await fetchImpl(url, { headers });
      if (!response.ok)
        throw new Error(`${table} 읽기 실패 ${response.status}: ${await response.text()}`);
      const page = await response.json();
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }

  /** 시험 계정(`app_metadata.duru_tester`) id입니다. */
  async function testerIds() {
    const testers = new Set();
    for (let page = 1; ; page += 1) {
      const response = await fetchImpl(`${base}/auth/v1/admin/users?page=${page}&per_page=1000`, {
        headers,
      });
      if (!response.ok) throw new Error(`사용자 목록 읽기 실패 ${response.status}`);
      const { users = [] } = await response.json();
      for (const user of users) {
        const flag = user.app_metadata?.duru_tester;
        if (flag === true || flag === "true") testers.add(user.id);
      }
      if (users.length < 1000) return testers;
    }
  }

  return {
    devices: () => selectAll("push_devices", "select=user_id,last_active_at&order=token"),
    profiles: () => selectAll("learner_profiles", "select=user_id,name,country_code&order=user_id"),
    progress: () =>
      selectAll("learning_progress", "select=user_id,cp:progress->catalogProgress&order=user_id"),
    days: (sinceDay) =>
      selectAll("learning_days", `select=user_id,day&day=gte.${sinceDay}&order=user_id,day`),
    testerIds,

    /** `send-push` announcement 한 번(같은 문구 · 최대 1,000명)입니다. */
    async sendAnnouncement({ userIds, title, body }) {
      const response = await fetchImpl(`${base}/functions/v1/send-push`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "announcement",
          audience: { userIds },
          title,
          body,
          target: null,
        }),
      });
      const text = await response.text();
      if (!response.ok) return { ok: false, status: response.status, error: text.slice(0, 200) };
      return { ok: true, status: response.status, summary: JSON.parse(text) };
    },
  };
}

/** HogQL 시각 문자열 → ms. 시간대 표시가 없으면 UTC로 읽습니다. */
export function hogqlTimeMs(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value);
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/**
 * 발송 뒤 72시간 동안 사람마다 첫 앱 이벤트 · 첫 알림 누름입니다. 키가 없으면 `null`.
 * PostHog distinct_id = Supabase 사용자 id(ADR-0127 D4).
 */
export async function posthogReturns(config, userIds, sentAtMs, { fetchImpl = fetch } = {}) {
  if (!config.posthogPersonalApiKey || !config.posthogProjectId) return null;
  const ids = userIds.filter((id) => UUID.test(id));
  const from = Math.floor(sentAtMs / 1000);
  const to = from + 72 * 3600;
  const result = new Map();
  for (let start = 0; start < ids.length; start += 300) {
    const list = ids
      .slice(start, start + 300)
      .map((id) => `'${id}'`)
      .join(",");
    const query =
      "SELECT distinct_id, min(timestamp), minIf(timestamp, event = 'push_notification_opened') FROM events " +
      `WHERE distinct_id IN (${list}) AND timestamp > fromUnixTimestamp(${from}) AND timestamp <= fromUnixTimestamp(${to}) ` +
      "AND properties.environment = 'production' AND NOT startsWith(event, '$') GROUP BY distinct_id";
    const response = await fetchImpl(
      `${config.posthogHost}/api/projects/${config.posthogProjectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.posthogPersonalApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      },
    );
    if (!response.ok) throw new Error(`PostHog 질의 실패 ${response.status}`);
    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    for (const [id, first, tap] of results) {
      const tapMs = hogqlTimeMs(tap);
      result.set(id, {
        firstEventMs: hogqlTimeMs(first),
        firstTapMs: tapMs !== null && tapMs > sentAtMs ? tapMs : null,
      });
    }
  }
  return result;
}

// ------------------------------------------------------------------ 캠페인 기록

const campaignsDir = () => path.join(storeDir(), "campaigns");

export function saveCampaign(campaign) {
  mkdirSync(campaignsDir(), { recursive: true });
  writeFileSync(
    path.join(campaignsDir(), `${campaign.id}.json`),
    `${JSON.stringify(campaign, null, 2)}\n`,
  );
}

export function loadCampaigns() {
  let names = [];
  try {
    names = readdirSync(campaignsDir()).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  return names
    .map((name) => {
      try {
        return JSON.parse(readFileSync(path.join(campaignsDir(), name), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.sentAtMs - a.sentAtMs);
}

/** 사람마다 이 콘솔로 마지막으로 받은 시각입니다(대조군 · 미리보기는 세지 않음). */
export function lastConsoleSends(campaigns) {
  const last = new Map();
  for (const campaign of campaigns) {
    if (campaign.dryRun) continue;
    for (const recipient of campaign.recipients) {
      if (recipient.group !== "sent") continue;
      last.set(recipient.userId, Math.max(last.get(recipient.userId) ?? 0, campaign.sentAtMs));
    }
  }
  return last;
}
