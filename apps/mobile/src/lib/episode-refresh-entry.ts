import "background-only";

// 갱신 모듈 안쪽 — 에피소드 하나의 본문 · 자산을 분류에 따라 받습니다. 다른 곳에서 쓰지 않습니다.
import { ensureEpisodeAssets } from "./episode-asset-sync";
import type { AssetDeps } from "./episode-asset-sync";
import { episodeAssetPaths } from "./episode-assets";
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

/** 자산을 갖추고 지켜보는 쪽에 파일 진행을 알립니다. 표시를 둔 키는 활성 또는 스테이징입니다. */
async function ensureAssets(
  run: PlannedEpisodeRun,
  assets: AssetDeps,
  entry: ManifestEntry,
  wire: unknown,
  marker: "active" | "staged",
): Promise<"completed" | "already" | "incomplete"> {
  const watch = run.watched.has(entry.id) ? run.deps.observer : undefined;
  const paths = episodeAssetPaths(wire);
  const total = paths.length + 1;
  let done = 1;
  watch?.progressed(entry.id, done, total);
  const outcome = await ensureEpisodeAssets(run.deps.store, assets, entry, paths, {
    ...(marker === "staged" ? { markerKey: contentStagedAssetsKey(entry.id) } : {}),
    onPathSettled: () => {
      done += 1;
      watch?.progressed(entry.id, done, total);
    },
  });
  if (outcome === "incomplete") return outcome;
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
  if (outcome === "incomplete") return "stop";
  if (outcome === "completed" && !staged && (kind === "new" || kind === "changed")) {
    deps.onEpisodeReady?.(entry.id);
  }
  return "continue";
}
