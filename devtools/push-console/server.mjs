#!/usr/bin/env node

// 로컬 푸시 콘솔 — `pnpm push:console` → http://127.0.0.1:4777
// 세그먼트 조회 · 캠페인 발송(대조군 포함) · 캠페인별 복귀 결과를 한 페이지에서 봅니다. 이 기기에서만 엽니다.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLearners,
  copyProblems,
  normalizeVariants,
  variantsProblems,
  hourForecast,
  messageFor,
  planRecipients,
  selectAudience,
  storyVariants,
  summarize,
} from "./audience.mjs";
import { DEFAULT_COPY, DEFAULT_COPY_B, DEFAULT_FILTERS } from "./copy.mjs";
import {
  claudeArgs,
  RECOMMENDATION_SCHEMA,
  recommendationContext,
  recommendationPrompt,
  validateRecommendations,
} from "./recommend.mjs";
import { campaignResults, poolResults, seriesOf } from "./results.mjs";
import { storyContentProblems, storyMessage, storyPack } from "./story.mjs";
import {
  batchesByMessage,
  episodeCatalog,
  LANGUAGES,
  SEGMENT_IDS,
  SEGMENTS,
  shiftDay,
} from "./segments.mjs";
import {
  lastConsoleSends,
  loadCampaigns,
  loadConfig,
  loadStoryFiles,
  posthogReturns,
  saveCampaign,
  serviceRoleKey,
  storeDir,
  supabaseClient,
} from "./sources.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const PORT = Number(process.env.PUSH_CONSOLE_PORT || 4777);
const HOST = "127.0.0.1";

// 디자인 시스템 — 토큰은 앱이 쓰는 `@libitums/design-tokens`, 폰트는 랜딩이 쓰는 패키지를 그대로 내줍니다(ADR-0011).
const packageDir = (from, name) =>
  path.dirname(
    createRequire(path.join(repoRoot, from, "package.json")).resolve(`${name}/package.json`),
  );
const STATIC_ROOTS = {
  "/ds/": path.join(packageDir("apps/mobile", "@libitums/design-tokens"), "dist/css"),
  "/fonts/pretendard/": path.join(packageDir("apps/landing", "pretendard"), "dist/web/variable"),
  "/fonts/jost/": packageDir("apps/landing", "@fontsource-variable/jost"),
};
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

/** 위 세 폴더 안의 css · 폰트 파일만 내줍니다. 폴더 밖으로 나가는 경로는 `null`. */
function staticFile(pathname) {
  for (const [prefix, root] of Object.entries(STATIC_ROOTS)) {
    if (!pathname.startsWith(prefix)) continue;
    const file = path.resolve(root, `.${decodeURIComponent(pathname.slice(prefix.length - 1))}`);
    const type = CONTENT_TYPES[path.extname(file)];
    if (!file.startsWith(root + path.sep) || type === undefined) return null;
    try {
      return { body: readFileSync(file), type };
    } catch {
      return null;
    }
  }
  return null;
}

const config = loadConfig();
if (!config.supabaseProjectRef) {
  console.error(
    `Supabase 프로젝트 ref가 없습니다. SUPABASE_PROJECT_REF 환경 변수나 ${path.join(storeDir(), "config.json")}의 ` +
      '{"supabaseProjectRef": "…"}로 알려 주세요.',
  );
  process.exit(1);
}
const supabase = supabaseClient({
  projectRef: config.supabaseProjectRef,
  key: serviceRoleKey(config.supabaseProjectRef),
});

function loadCatalog() {
  const contentDir = path.join(repoRoot, "apps/mobile/content");
  const manifest = JSON.parse(readFileSync(path.join(contentDir, "manifest.json"), "utf8"));
  const episodes = {};
  for (const entry of manifest.episodes) {
    episodes[entry.id] = JSON.parse(readFileSync(path.join(contentDir, entry.url), "utf8"));
  }
  return episodeCatalog(manifest, episodes);
}
const catalog = loadCatalog();

// 단계별 예고(D11) — 새로 고칠 때마다 버킷에서 다시 읽고, 못 읽으면 예고 세그먼트만 비웁니다.
let story = null;
let storyStatus = { loaded: false, units: 0, problems: [] };
async function loadStory() {
  try {
    const { index, units } = await loadStoryFiles(config.supabaseProjectRef);
    story = storyPack(index, units);
    storyStatus = {
      loaded: true,
      units: story.catalog.length,
      problems: storyContentProblems(units, catalog),
    };
    if (storyStatus.problems.length > 0)
      console.error(`예고 파일 문제: ${storyStatus.problems.join(" / ")}`);
  } catch (error) {
    story = null;
    storyStatus = { loaded: false, units: 0, problems: [String(error)] };
    console.error(String(error));
  }
}
const isStory = (input) => input.segment === "story-next";
function storyOrThrow() {
  if (story === null)
    throw new Error("단계별 예고 파일을 읽지 못했어요 — 새로 고침 후 다시 해 주세요.");
  return story;
}

let snapshot = null;
async function refresh() {
  await loadStory();
  const nowMs = Date.now();
  const sinceDay = shiftDay(new Date(nowMs).toISOString().slice(0, 10), -40);
  const [devices, profiles, progress, days, testers] = await Promise.all([
    supabase.devices(),
    supabase.profiles(),
    supabase.progress(),
    supabase.days(sinceDay),
    supabase.testerIds(),
  ]);
  const everyone = buildLearners({
    devices,
    profiles,
    progress,
    days,
    testers: new Set(),
    catalog,
    nowMs,
    story,
  });
  snapshot = {
    loadedAtMs: nowMs,
    learners: everyone.filter((row) => !testers.has(row.userId)),
    testerLearners: everyone.filter((row) => testers.has(row.userId)),
    testers: testers.size,
  };
  return snapshot;
}

function audienceFor(input) {
  if (!SEGMENT_IDS.has(input.segment)) throw new Error("모르는 세그먼트입니다.");
  const nowMs = Date.now();
  const filter = {
    segment: input.segment,
    minIdleHours: Number(input.minIdleHours ?? 0),
    maxIdleHours:
      input.maxIdleHours === null || input.maxIdleHours === "" ? null : Number(input.maxIdleHours),
    localHours: Array.isArray(input.localHours) ? input.localHours.map(Number) : null,
    excludeReengagement: input.excludeReengagement !== false,
    cooldownHours: Number(input.cooldownHours ?? 24),
  };
  const holdoutPercent = Math.min(90, Math.max(0, Number(input.holdoutPercent ?? 20)));
  const selection = selectAudience(snapshot.learners, filter, {
    nowMs,
    lastConsoleSendMs: lastConsoleSends(loadCampaigns()),
  });
  return { nowMs, filter, holdoutPercent, selection };
}

const summaryOf = (campaign) => ({
  id: campaign.id,
  name: campaign.name,
  segment: campaign.segment,
  sentAtMs: campaign.sentAtMs,
  status: campaign.status,
  holdoutPercent: campaign.holdoutPercent,
  series: seriesOf(campaign),
  counts: {
    sent: campaign.recipients.filter((row) => row.group === "sent").length,
    control: campaign.recipients.filter((row) => row.group === "control").length,
  },
  totals: campaign.totals,
});

/**
 * 대조군 나누기 기준값 — 묶음 이름입니다. 같은 묶음은 회차가 바뀌어도 같은 사람이 대조군에 남아(누적 효과를 잼),
 * 미리보기와 발송도 같은 값을 써서 확인창의 수와 실제 수가 같습니다.
 */
const holdoutKeyOf = (input) =>
  `series:${seriesOf({ series: input.series, name: input.name, segment: input.segment })}`;

async function send(input) {
  if (input.confirm !== "SEND") throw new Error("확인 문구가 없습니다.");
  const storyInput = isStory(input) ? storyOrThrow() : undefined;
  const variants = normalizeVariants(input);
  const problems = storyInput ? [] : variantsProblems(variants);
  if (problems.length > 0) throw new Error(problems.join(" "));
  const { nowMs, filter, holdoutPercent, selection } = audienceFor(input);
  if (selection.eligible.length === 0) throw new Error("보낼 사람이 없습니다.");

  const seed = holdoutKeyOf(input);
  const stamp = new Date(nowMs).toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const id = `${stamp}-${input.segment}-${randomBytes(2).toString("hex")}`;
  const recipients = planRecipients({
    campaignId: seed,
    eligible: selection.eligible,
    holdoutPercent,
    variants,
    story: storyInput,
  });
  const sentCount = recipients.filter((row) => row.group === "sent").length;
  if (input.expectedSent !== undefined && Number(input.expectedSent) !== sentCount) {
    throw new Error(
      `대상이 바뀌었어요(미리보기 ${input.expectedSent}명 → 지금 ${sentCount}명). 대상을 다시 계산해 주세요.`,
    );
  }
  const campaign = {
    id,
    name: String(input.name || input.segment).slice(0, 80),
    series: String(input.series ?? "")
      .trim()
      .slice(0, 80),
    segment: input.segment,
    filter,
    holdoutPercent,
    holdoutSeed: seed,
    copy: storyInput ? null : variants[0].copy,
    variants: storyInput ? storyVariants(recipients) : variants,
    ...(storyInput ? { story: "push/level-5" } : {}),
    sentAtMs: nowMs,
    status: "sending",
    inSegment: selection.inSegment,
    excluded: selection.excluded,
    recipients,
    batches: [],
    totals: { devices: 0, sent: 0, failed: 0, removed: 0, failedCalls: 0 },
  };
  saveCampaign(campaign);

  const batches = batchesByMessage(
    recipients
      .filter((row) => row.group === "sent")
      .map((row) => ({ userId: row.userId, title: row.title, body: row.body })),
  );
  let next = 0;
  async function worker() {
    while (next < batches.length) {
      const batch = batches[next++];
      const result = await supabase
        .sendAnnouncement(batch)
        .catch((error) => ({ ok: false, error: String(error) }));
      campaign.batches.push({
        title: batch.title,
        body: batch.body,
        users: batch.userIds.length,
        result,
      });
      if (result.ok) {
        for (const key of ["devices", "sent", "failed", "removed"])
          campaign.totals[key] += result.summary?.[key] ?? 0;
      } else campaign.totals.failedCalls += 1;
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, batches.length) }, worker));
  campaign.status = "sent";
  saveCampaign(campaign);
  return summaryOf(campaign);
}

const resultCache = new Map();
async function resultsFor(id) {
  const campaign = loadCampaigns().find((entry) => entry.id === id);
  if (!campaign) throw new Error("캠페인이 없습니다.");
  const cached = resultCache.get(id);
  if (cached && Date.now() - cached.atMs < 5 * 60 * 1000) return cached.value;

  const ids = new Set(campaign.recipients.map((row) => row.userId));
  const sinceDay = shiftDay(new Date(campaign.sentAtMs).toISOString().slice(0, 10), -1);
  const [devices, days, posthog] = await Promise.all([
    supabase.devices(),
    supabase.days(sinceDay),
    posthogReturns(config, [...ids], campaign.sentAtMs).catch((error) => {
      console.error(String(error));
      return null;
    }),
  ]);
  const lastActiveNow = new Map();
  for (const row of devices) {
    if (!ids.has(row.user_id)) continue;
    lastActiveNow.set(
      row.user_id,
      Math.max(lastActiveNow.get(row.user_id) ?? 0, Date.parse(row.last_active_at)),
    );
  }
  const learningDays = new Map();
  for (const row of days) {
    if (!ids.has(row.user_id)) continue;
    const set = learningDays.get(row.user_id) ?? new Set();
    set.add(row.day);
    learningDays.set(row.user_id, set);
  }
  const value = {
    campaign: {
      ...summaryOf(campaign),
      filter: campaign.filter,
      excluded: campaign.excluded,
      batches: campaign.batches,
    },
    results: campaignResults(campaign, { lastActiveNow, learningDays, posthog }, Date.now()),
  };
  resultCache.set(id, { atMs: Date.now(), value });
  return value;
}

// ------------------------------------------------------------------ 묶음 · 테스트 발송

/** 묶음마다 캠페인 수 · 세그먼트 · 마지막 발송입니다. */
function seriesList() {
  const groups = new Map();
  for (const campaign of loadCampaigns().filter((entry) => !entry.dryRun)) {
    const key = seriesOf(campaign);
    const group = groups.get(key) ?? { key, campaigns: 0, segments: new Set(), lastSentAtMs: 0 };
    group.campaigns += 1;
    group.segments.add(campaign.segment);
    group.lastSentAtMs = Math.max(group.lastSentAtMs, campaign.sentAtMs);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, segments: [...group.segments] }))
    .sort((a, b) => b.lastSentAtMs - a.lastSentAtMs);
}

async function seriesResults(key) {
  const campaigns = loadCampaigns().filter((entry) => !entry.dryRun && seriesOf(entry) === key);
  if (campaigns.length === 0) throw new Error("묶음이 없습니다.");
  const each = [];
  for (const campaign of campaigns) each.push(await resultsFor(campaign.id));
  return {
    series: key,
    pooled: poolResults(each.map((entry) => entry.results)),
    campaigns: each.map(({ campaign, results }) => ({
      ...campaign,
      studied72:
        results.metrics.find((row) => row.metric === "studied" && row.hours === 72) ?? null,
    })),
  };
}

/** 시험 계정 기기로만 보냅니다. 캠페인 기록 · 대조군 · 쉬는 시간에 들어가지 않고 `test-sends.jsonl`에 남습니다. */
async function testSend(input) {
  const tester = snapshot.testerLearners.find((row) => row.userId === input.userId);
  if (!tester) throw new Error("시험 계정에게만 테스트로 보낼 수 있어요.");
  let message;
  if (isStory(input)) {
    // 그 시험 계정의 진행 자리 예고 — 훅은 매번 다음 것으로 돌려 셋을 다 볼 수 있게 합니다.
    const pack = storyOrThrow();
    if (!tester.story) throw new Error("이 시험 계정은 예고할 단계가 없어요(튜토리얼 레슨 1 전).");
    message = storyMessage({
      content: pack.units,
      titles: pack.titles,
      place: tester.story,
      lang: input.lang || tester.storyLang,
      hookIndex: Number(input.hookIndex ?? 0),
    });
  } else {
    const problems = copyProblems(input.copy);
    if (problems.length > 0) throw new Error(problems.join(" "));
    const lang = LANGUAGES.includes(input.lang) ? input.lang : tester.lang;
    message = messageFor({ ...tester, lang }, input.copy);
  }
  const result = await supabase.sendAnnouncement({
    userIds: [tester.userId],
    title: message.title,
    body: message.body,
  });
  mkdirSync(storeDir(), { recursive: true });
  appendFileSync(
    path.join(storeDir(), "test-sends.jsonl"),
    `${JSON.stringify({ atMs: Date.now(), userId: tester.userId, lang: message.lang, title: message.title, body: message.body, result })}\n`,
  );
  return { message, result };
}

// ------------------------------------------------------------------ Claude 추천

const recommendationsFile = () => path.join(storeDir(), "recommendations", "latest.json");

function latestRecommendations() {
  try {
    return JSON.parse(readFileSync(recommendationsFile(), "utf8"));
  } catch {
    return null;
  }
}

/** `claude -p`를 기록 폴더에서 돌립니다(저장소 지침 · 도구 · MCP 없음). 5분이 넘으면 끊습니다. */
function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    mkdirSync(storeDir(), { recursive: true });
    const child = spawn("claude", claudeArgs(RECOMMENDATION_SCHEMA), {
      cwd: storeDir(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), 5 * 60 * 1000);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`claude를 실행하지 못했어요: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let output = null;
      try {
        output = JSON.parse(stdout);
      } catch {
        output = null;
      }
      if (output?.structured_output && !output.is_error) return resolve(output);
      reject(
        new Error(
          `claude 응답을 읽지 못했어요(종료 ${code}). ${(output?.result ?? stderr).slice(0, 300)}`,
        ),
      );
    });
    child.stdin.end(prompt);
  });
}

let recommending = null;
async function recommend() {
  const nowMs = Date.now();
  const lastConsoleSendMs = lastConsoleSends(loadCampaigns());
  const forecasts = {};
  for (const segment of SEGMENTS) {
    const defaults = DEFAULT_FILTERS[segment.id];
    const { hourCandidates } = selectAudience(
      snapshot.learners,
      { ...defaults, segment: segment.id, localHours: null },
      { nowMs, lastConsoleSendMs },
    );
    forecasts[segment.id] = hourForecast(hourCandidates, defaults.localHours ?? [18, 21], nowMs);
  }
  const campaigns = [];
  for (const campaign of loadCampaigns()
    .filter((entry) => !entry.dryRun)
    .slice(0, 8)) {
    const { results } = await resultsFor(campaign.id);
    campaigns.push({
      name: campaign.name,
      segment: campaign.segment,
      sentAtMs: campaign.sentAtMs,
      holdoutPercent: campaign.holdoutPercent,
      copyEn: campaign.copy?.en ?? null,
      variants: (campaign.variants ?? []).map((variant) => ({
        id: variant.id,
        label: variant.label,
        titleEn: variant.copy?.en?.title ?? null,
      })),
      variantVsBaseline: (results.headToHead ?? []).map((entry) => ({
        variant: entry.id,
        baseline: entry.baseline,
        metrics: entry.metrics.map((metric) => ({
          metric: metric.metric,
          hours: metric.hours,
          complete: metric.complete,
          diff: metric.compare?.diff ?? null,
          low: metric.compare?.low ?? null,
          high: metric.compare?.high ?? null,
        })),
      })),
      counts: results.counts,
      metrics: results.metrics.map((metric) => ({
        metric: metric.metric,
        hours: metric.hours,
        complete: metric.complete,
        sentRate: metric.sent.n ? metric.sent.hits / metric.sent.n : null,
        controlRate: metric.control.n ? metric.control.hits / metric.control.n : null,
        diff: metric.compare?.diff ?? null,
        low: metric.compare?.low ?? null,
        high: metric.compare?.high ?? null,
      })),
    });
  }
  const context = recommendationContext({
    nowMs,
    computerTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    segments: summarize(snapshot.learners, SEGMENTS),
    forecasts,
    campaigns,
    defaultCopy: DEFAULT_COPY,
  });
  const output = await runClaude(recommendationPrompt(context));
  const record = {
    createdAtMs: nowMs,
    ...validateRecommendations(output.structured_output),
    costUsd: output.total_cost_usd ?? null,
    durationMs: output.duration_ms ?? null,
    model: Object.keys(output.modelUsage ?? {})[0] ?? null,
  };
  mkdirSync(path.dirname(recommendationsFile()), { recursive: true });
  writeFileSync(recommendationsFile(), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

// ------------------------------------------------------------------ HTTP

const json = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
};

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text === "" ? {} : JSON.parse(text);
}

const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

const server = createServer(async (request, response) => {
  // 다른 사이트가 이 주소를 부르지 못하게 — 호스트 이름 고정(DNS 리바인딩) · POST는 사용자 정의 헤더.
  if (!allowedHosts.has(request.headers.host ?? "")) return json(response, 403, { error: "host" });
  if (request.method === "POST" && request.headers["x-push-console"] !== "1")
    return json(response, 403, { error: "header" });

  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (
      request.method === "GET" &&
      (url.pathname.startsWith("/ds/") || url.pathname.startsWith("/fonts/"))
    ) {
      const file = staticFile(url.pathname);
      if (file === null) return json(response, 404, { error: "not found" });
      response.writeHead(200, { "Content-Type": file.type, "Cache-Control": "max-age=3600" });
      return response.end(file.body);
    }
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      return response.end(readFileSync(path.join(here, "page.html")));
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      return json(response, 200, {
        loadedAtMs: snapshot.loadedAtMs,
        learners: snapshot.learners.length,
        testersExcluded: snapshot.testers,
        posthog: Boolean(config.posthogPersonalApiKey && config.posthogProjectId),
        segments: summarize(snapshot.learners, SEGMENTS),
        defaults: { copy: DEFAULT_COPY, copyB: DEFAULT_COPY_B, filters: DEFAULT_FILTERS },
        languages: LANGUAGES,
        story: storyStatus,
        campaigns: loadCampaigns().map(summaryOf),
        series: seriesList(),
        testers: snapshot.testerLearners.map((row) => ({
          userId: row.userId,
          name: row.name,
          lang: row.lang,
          country: row.country,
        })),
      });
    }
    if (request.method === "GET" && url.pathname === "/api/recommendations") {
      return json(response, 200, {
        latest: latestRecommendations(),
        running: recommending !== null,
      });
    }
    if (request.method === "POST" && url.pathname === "/api/recommendations") {
      // 두 번 눌러도 claude는 한 번만 돕니다.
      recommending ??= recommend().finally(() => (recommending = null));
      return json(response, 200, { latest: await recommending });
    }
    if (request.method === "POST" && url.pathname === "/api/test-send") {
      return json(response, 200, await testSend(await readBody(request)));
    }
    const seriesMatch = url.pathname.match(/^\/api\/series\/(.+)\/results$/);
    if (request.method === "GET" && seriesMatch) {
      return json(response, 200, await seriesResults(decodeURIComponent(seriesMatch[1])));
    }
    if (request.method === "POST" && url.pathname === "/api/refresh") {
      await refresh();
      return json(response, 200, { loadedAtMs: snapshot.loadedAtMs });
    }
    if (request.method === "POST" && url.pathname === "/api/audience") {
      const input = await readBody(request);
      const { nowMs, filter, holdoutPercent, selection } = audienceFor(input);
      const variants = normalizeVariants({
        copy: input.copy ?? DEFAULT_COPY[input.segment],
        variants: input.variants,
      });
      const seed = holdoutKeyOf(input);
      const storyInput = isStory(input) ? storyOrThrow() : undefined;
      const recipients = planRecipients({
        campaignId: seed,
        eligible: selection.eligible,
        holdoutPercent,
        variants,
        story: storyInput,
      });
      const byLang = {};
      const byVariant = {};
      for (const row of recipients) {
        byLang[row.lang] = (byLang[row.lang] ?? 0) + 1;
        if (row.variant) byVariant[row.variant] = (byVariant[row.variant] ?? 0) + 1;
      }
      const learnerOf = new Map(selection.eligible.map((row) => [row.userId, row]));
      // 변형 × 언어마다 한 명씩 먼저(받는 사람만), 남는 자리는 앞에서부터 — 12명까지(예고는 변형이 훅).
      const firstOfLang = new Map();
      for (const row of recipients) {
        const key = `${row.variant}:${row.lang}`;
        if (row.group === "sent" && !firstOfLang.has(key)) firstOfLang.set(key, row);
      }
      const picked = [...firstOfLang.values()];
      for (const row of recipients) {
        if (picked.length >= 12) break;
        if (row.group === "sent" && !picked.includes(row)) picked.push(row);
      }
      const samples = [];
      for (const row of picked.slice(0, 12)) {
        const learner = learnerOf.get(row.userId);
        samples.push({
          variant: row.variant,
          lang: row.lang,
          country: learner.country,
          localHour: learner.localHour,
          idleHours: Math.round(learner.idleHours),
          episode: learner.episodeTitle,
          storyStep: row.storyStep ?? null,
          streak: learner.streak,
          title: row.title,
          body: row.body,
        });
      }
      return json(response, 200, {
        inSegment: selection.inSegment,
        eligible: recipients.length,
        sent: recipients.filter((row) => row.group === "sent").length,
        control: recipients.filter((row) => row.group === "control").length,
        excluded: selection.excluded,
        byLang,
        byVariant,
        variants: storyInput
          ? storyVariants(recipients)
          : variants.map((variant) => ({ id: variant.id, label: variant.label })),
        seed,
        story: Boolean(storyInput),
        problems: storyInput ? [] : variantsProblems(variants),
        forecast: hourForecast(selection.hourCandidates, filter.localHours, nowMs),
        samples,
      });
    }
    if (request.method === "POST" && url.pathname === "/api/send") {
      return json(response, 200, await send(await readBody(request)));
    }
    const match = url.pathname.match(/^\/api\/campaigns\/([\w-]+)\/results$/);
    if (request.method === "GET" && match) return json(response, 200, await resultsFor(match[1]));
    return json(response, 404, { error: "not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${request.method} ${url.pathname} — ${message}`);
    return json(response, 400, { error: message });
  }
});

console.log("서버 데이터를 읽는 중…");
await refresh();
server.listen(PORT, HOST, () => {
  console.log(
    `푸시 콘솔: http://${HOST}:${PORT}  (학습자 ${snapshot.learners.length}명 · 시험 계정 ${snapshot.testers}명 제외)`,
  );
  console.log(`캠페인 기록: ${path.join(storeDir(), "campaigns")}`);
});
