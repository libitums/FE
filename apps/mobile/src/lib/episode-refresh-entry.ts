import "background-only";

// 갱신 모듈 안쪽 — 에피소드 하나의 본문 · 자산을 분류에 따라 받습니다. 다른 곳에서 쓰지 않습니다.
import type { AssetTarget } from "./download-policy";
import { ensureEpisodeAssetGroups } from "./episode-asset-groups-sync";
import type { EnsureGroupsOutcome } from "./episode-asset-groups-sync";
import type { AssetDeps } from "./episode-asset-sync";
import { episodeAssetGroups, episodeAssetPaths } from "./episode-assets";
import { contentEpisodeKey, safeGet, trySet } from "./episode-cache";
import { checkEpisodeText } from "./episode-catalog";
import type { ManifestEntry } from "./episode-manifest";
import type { RefreshDeps, RefreshSummary } from "./episode-refresh";
import type { FetchTextResult } from "./episode-remote";
import { contentStagedAssetsKey, readStagedEpisode, writeStagedEpisode } from "./episode-staging";
import { matchesEntry } from "./episode-update-plan";
import type { PlannedEpisode } from "./episode-update-plan";

export type PlannedEpisodeRun = {
  readonly deps: RefreshDeps;
  readonly summary: RefreshSummary;
  readonly canStore: boolean;
  readonly staging: "available" | "unavailable";
  /** 관찰자에 알릴 id(splashEpisodeIds 결과). */
  readonly watched: ReadonlySet<string>;
};

/** 전송 호출 하나가 reject하면 그 호출만 연결 실패로 봅니다. */
async function safeFetch(run: PlannedEpisodeRun, entry: ManifestEntry): Promise<FetchTextResult> {
  try {
    return await run.deps.fetchText(entry.url, { kind: "version", sha256: entry.sha256 });
  } catch {
    return { ok: false, reason: "network" };
  }
}

function parseWire(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 원격 본문을 받아 항목과 맞는지 검증합니다. 못 얻으면 `null`(사유는 summary에 적습니다). */
async function fetchEntryText(
  run: PlannedEpisodeRun,
  entry: ManifestEntry,
): Promise<string | null> {
  const reply = await safeFetch(run, entry);
  if (!reply.ok) {
    run.summary.failed.push({ id: entry.id, reason: "network" });
    return null;
  }
  if (reply.status !== 200) {
    run.summary.failed.push({ id: entry.id, reason: "http" });
    return null;
  }
  const checked = checkEpisodeText(entry, reply.text);
  if (!checked.ok) {
    run.summary.locked.push({ id: entry.id, reason: checked.reason });
    return null;
  }
  return reply.text;
}

/** 활성 키에 둘 본문 — 이미 맞는 캐시가 있으면 그것, 없으면 받아서 검증 · 저장합니다. */
async function activeText(run: PlannedEpisodeRun, entry: ManifestEntry): Promise<string | null> {
  const { store } = run.deps;
  const cached = safeGet(store, contentEpisodeKey(entry.id));
  if (cached !== null && matchesEntry(entry, cached)) return cached;
  const text = await fetchEntryText(run, entry);
  if (text === null) return null;
  if (run.canStore && !trySet(store, contentEpisodeKey(entry.id), text)) {
    run.summary.persisted = false;
    return null;
  }
  run.summary.fetched.push(entry.id);
  return text;
}

/** 스테이징 키에 둘 본문 — 스테이징본, 같은 sha의 활성본, 받아서 검증한 것 순입니다. */
async function stagedText(run: PlannedEpisodeRun, entry: ManifestEntry): Promise<string | null> {
  const { store } = run.deps;
  const staged = readStagedEpisode(store, entry.id);
  if (staged !== null && staged.entry.sha256 === entry.sha256) return staged.text;
  const open = safeGet(store, contentEpisodeKey(entry.id));
  const reused = open !== null && matchesEntry(entry, open);
  const text = reused ? open : await fetchEntryText(run, entry);
  if (text === null) return null;
  if (!writeStagedEpisode(store, entry, text)) {
    run.summary.persisted = false;
    return null;
  }
  if (!reused) run.summary.fetched.push(entry.id);
  return text;
}

function safePolicy(
  policy: (id: string, target: AssetTarget) => boolean,
  id: string,
  target: AssetTarget,
): boolean {
  try {
    return policy(id, target);
  } catch {
    return true;
  }
}

/** 자산을 공통 → 유닛 순으로 갖추고 지켜보는 쪽에 파일 진행을 알립니다. 표시를 둔 키는 활성 또는 스테이징입니다. */
async function ensureAssets(
  run: PlannedEpisodeRun,
  assets: AssetDeps,
  entry: ManifestEntry,
  wire: unknown,
  marker: "active" | "staged",
): Promise<EnsureGroupsOutcome> {
  const watch = run.watched.has(entry.id) ? run.deps.observer : undefined;
  const total = episodeAssetPaths(wire).length + 1;
  const settled = new Set<string>();
  let done = 1;
  watch?.progressed(entry.id, done, total);
  const policy = run.deps.assetPolicy;
  const outcome = await ensureEpisodeAssetGroups(
    run.deps.store,
    assets,
    entry,
    episodeAssetGroups(wire),
    {
      ...(marker === "staged" ? { markerKey: contentStagedAssetsKey(entry.id) } : {}),
      groupMarkers: marker === "staged" ? "none" : "active",
      ...(policy === undefined
        ? {}
        : { allowed: (target: AssetTarget) => safePolicy(policy, entry.id, target) }),
      // 이번 차례에 매니페스트가 바뀌었으면 「서버에 없음」을 시간과 상관없이 다시 봅니다(ADR-0095 D2).
      recheckMissing: run.summary.manifest === "updated",
      // 묶음에 겹친 경로는 한 번만 셉니다 — done이 total을 넘지 않습니다.
      onPathSettled: (path) => {
        if (settled.has(path)) return;
        settled.add(path);
        done += 1;
        watch?.progressed(entry.id, done, total);
      },
    },
  );
  if (outcome === "incomplete" || outcome === "deferred") return outcome;
  if (done < total) watch?.progressed(entry.id, total, total);
  watch?.ready(entry.id);
  return outcome;
}

/** 한 에피소드를 받습니다. 자산을 못 갖췄으면 "stop"(그 자리에서 멈춤), 그 밖은 "continue". 던지지 않음. */
export async function runPlannedEpisode(
  run: PlannedEpisodeRun,
  planned: PlannedEpisode,
): Promise<"continue" | "stop"> {
  const { entry, kind } = planned;
  const { deps } = run;
  const staged = kind === "changed" && run.staging === "available";
  let wire: unknown = deps.bundled.episodes[entry.id];
  if (kind === "current") {
    const text = safeGet(deps.store, contentEpisodeKey(entry.id));
    wire = text === null ? null : parseWire(text);
  } else if (kind !== "bundled") {
    const text = staged ? await stagedText(run, entry) : await activeText(run, entry);
    if (text === null) return "continue";
    wire = parseWire(text);
  }
  // 검증을 통과한 본문이라 일어나지 않아야 합니다 — 그래도 읽지 못한 본문을 「자산 없음 = 완료」로 열지 않습니다.
  if (wire === null || wire === undefined) return "continue";
  if (deps.assets === undefined || !run.canStore) return "continue";
  const outcome = await ensureAssets(run, deps.assets, entry, wire, staged ? "staged" : "active");
  // 받기 정책이 묶음을 막으면 나머지만 받고 다음 편으로 갑니다 — 멈추지 않습니다(ADR-0095 D5).
  if (outcome === "deferred") {
    run.summary.deferred.push(entry.id);
    return "continue";
  }
  if (outcome === "incomplete") return "stop";
  if (outcome === "completed" && !staged && (kind === "new" || kind === "changed")) {
    deps.onEpisodeReady?.(entry.id);
  }
  if (outcome === "completed" && staged) deps.onEpisodeStaged?.(entry.id);
  return "continue";
}
