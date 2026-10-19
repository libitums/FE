import "background-only";

// 백그라운드 갱신 — 원격 매니페스트 → 바뀐 에피소드만 받기 → 검증 → 캐시. 던지지 않습니다.
import { ensureEpisodeAssets } from "./episode-asset-sync";
import type { AssetDeps } from "./episode-asset-sync";
import { episodeAssetPaths } from "./episode-assets";
import { CONTENT_MANIFEST_KEY, contentEpisodeKey } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import {
  CONTENT_CLIENT_LEVEL,
  SUPPORTED_EPISODE_SCHEMAS,
  checkEpisodeText,
  compareVersions,
  parseCachedManifest,
} from "./episode-catalog";
import type { CatalogInput, LockReason } from "./episode-catalog";
import { decodeManifest } from "./episode-manifest";
import type { EpisodeManifest, ManifestEntry } from "./episode-manifest";
import type { FetchText, FetchTextResult } from "./episode-remote";
import { sha256Hex, utf8Bytes } from "./sha256";

export type RefreshSummary = {
  manifest: "updated" | "unchanged" | "unavailable" | "invalid";
  fetched: string[];
  locked: { id: string; reason: LockReason }[];
  failed: { id: string; reason: "network" | "http" }[];
  removed: string[];
  persisted: boolean;
};

export type RefreshDeps = {
  fetchText: FetchText;
  store: ContentStore;
  bundled: CatalogInput["bundled"];
  /**
   * 있으면 에피소드마다 본문 직후 그 자산(이미지 · 음성)을 받아 둡니다(ADR-0071). 없으면 본문만 받습니다 —
   * 파일 모듈이 없는 환경의 지금 동작입니다.
   */
  assets?: AssetDeps;
  /** 원격 에피소드 하나가 본문 + 자산까지 갖춰진 순간 그 id로 한 번 부릅니다. */
  onEpisodeReady?: (id: string) => void;
};

const MANIFEST_PATH = "manifest.json";

function emptySummary(manifest: RefreshSummary["manifest"], persisted: boolean): RefreshSummary {
  return { manifest, fetched: [], locked: [], failed: [], removed: [], persisted };
}

/** 전송 호출 하나가 reject하면 그 호출만 연결 실패로 봅니다. */
async function safeFetch(fetchText: FetchText, relative: string): Promise<FetchTextResult> {
  try {
    return await fetchText(relative);
  } catch {
    return { ok: false, reason: "network" };
  }
}

function safeAvailable(store: ContentStore): boolean {
  try {
    return store.available();
  } catch {
    return false;
  }
}

function safeGet(store: ContentStore, key: string): string | null {
  try {
    return store.get(key);
  } catch {
    return null;
  }
}

/** 쓰기 하나 — 저장소가 없거나 쓰기가 던지면 `false`입니다. */
function trySet(store: ContentStore, key: string, value: string): boolean {
  try {
    store.set(key, value);
    return true;
  } catch {
    return false;
  }
}

function tryRemove(store: ContentStore, key: string): boolean {
  try {
    store.remove(key);
    return true;
  } catch {
    return false;
  }
}

function parseManifestText(text: string): EpisodeManifest | null {
  try {
    const decoded = decodeManifest(JSON.parse(text));
    return decoded.ok ? decoded.manifest : null;
  } catch {
    return null;
  }
}

/** 원격 항목이 이겨서 앱에 오는지 — 내장에 없거나 내장보다 version이 높을 때입니다. */
function winsOverBundled(entry: ManifestEntry, bundled: EpisodeManifest): boolean {
  const own = bundled.episodes.find((candidate) => candidate.id === entry.id);
  return own === undefined || compareVersions(entry.version, own.version) > 0;
}

function parseWire(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 원격이 이긴 항목의 본문 — 이미 맞는 캐시가 있으면 그것, 없으면 받아서 검증 · 저장합니다. 못 얻으면 `null`. */
async function entryText(
  deps: RefreshDeps,
  entry: ManifestEntry,
  summary: RefreshSummary,
  canStore: boolean,
): Promise<string | null> {
  const { fetchText, store } = deps;
  const cached = safeGet(store, contentEpisodeKey(entry.id));
  if (cached !== null && sha256Hex(utf8Bytes(cached)) === entry.sha256) {
    return cached;
  }
  const reply = await safeFetch(fetchText, entry.url);
  if (!reply.ok) {
    summary.failed.push({ id: entry.id, reason: "network" });
    return null;
  }
  if (reply.status !== 200) {
    summary.failed.push({ id: entry.id, reason: "http" });
    return null;
  }
  const checked = checkEpisodeText(entry, reply.text);
  if (!checked.ok) {
    summary.locked.push({ id: entry.id, reason: checked.reason });
    return null;
  }
  if (canStore && !trySet(store, contentEpisodeKey(entry.id), reply.text)) {
    summary.persisted = false;
    return null;
  }
  summary.fetched.push(entry.id);
  return reply.text;
}

type Planned = { entry: ManifestEntry; fromRemote: boolean };

/** 받을 차례입니다 — 내장 · 원격을 id로 합쳐 `order` 순. 원격이 내장을 이긴 id만 원격으로 갑니다. */
function planOf(bundled: EpisodeManifest, remote: EpisodeManifest): Planned[] {
  const planned = new Map<string, Planned>();
  for (const entry of bundled.episodes) planned.set(entry.id, { entry, fromRemote: false });
  for (const entry of remote.episodes) {
    if (winsOverBundled(entry, bundled)) planned.set(entry.id, { entry, fromRemote: true });
  }
  return [...planned.values()].sort((a, b) => a.entry.order - b.entry.order);
}

/**
 * 에피소드를 **하나씩** 받습니다 — 원격 본문 → 그 에피소드의 자산 → 다음 에피소드. 본문을 못 받은 에피소드는
 * 건너뛰고(지금 규칙), 자산을 못 갖춘 에피소드에서는 멈춥니다 — 다음 기회(연결 · 포그라운드 복귀)에 그 자리부터
 * 이어 받습니다(ADR-0071).
 */
async function fetchEntries(
  deps: RefreshDeps,
  remote: EpisodeManifest,
  summary: RefreshSummary,
  canStore: boolean,
): Promise<void> {
  const { store, bundled, assets } = deps;
  const tooOld = (remote.minClientLevel ?? 0) > CONTENT_CLIENT_LEVEL;

  for (const { entry, fromRemote } of planOf(bundled.manifest, remote)) {
    let wire: unknown = bundled.episodes[entry.id];
    if (fromRemote) {
      if (tooOld) {
        summary.locked.push({ id: entry.id, reason: "client-too-old" });
        continue;
      }
      if (!SUPPORTED_EPISODE_SCHEMAS.includes(entry.schema)) {
        summary.locked.push({ id: entry.id, reason: "unsupported-schema" });
        continue;
      }
      const text = await entryText(deps, entry, summary, canStore);
      if (text === null) continue;
      wire = parseWire(text);
      // 검증을 통과한 본문이라 일어나지 않아야 합니다 — 그래도 읽지 못한 본문을 「자산 없음 = 완료」로 열지 않습니다.
      if (wire === null) continue;
    }
    if (assets === undefined || !canStore) continue;
    const outcome = await ensureEpisodeAssets(store, assets, entry, episodeAssetPaths(wire));
    if (outcome === "incomplete") return;
    if (outcome === "completed" && fromRemote) deps.onEpisodeReady?.(entry.id);
  }
}

function removeVanished(
  store: ContentStore,
  previous: EpisodeManifest | null,
  remote: EpisodeManifest,
  summary: RefreshSummary,
): void {
  const kept = new Set(remote.episodes.map((entry) => entry.id));
  for (const entry of previous?.episodes ?? []) {
    if (kept.has(entry.id)) {
      continue;
    }
    if (tryRemove(store, contentEpisodeKey(entry.id))) {
      summary.removed.push(entry.id);
    } else {
      summary.persisted = false;
    }
  }
}

async function refresh(deps: RefreshDeps): Promise<RefreshSummary> {
  const { fetchText, store } = deps;
  const canStore = safeAvailable(store);

  const reply = await safeFetch(fetchText, MANIFEST_PATH);
  if (!reply.ok || reply.status !== 200) {
    return emptySummary("unavailable", canStore);
  }
  const remote = parseManifestText(reply.text);
  if (remote === null) {
    return emptySummary("invalid", canStore);
  }

  const previousText = canStore ? safeGet(store, CONTENT_MANIFEST_KEY) : null;
  const unchanged = previousText === reply.text;
  const summary = emptySummary(unchanged ? "unchanged" : "updated", canStore);

  if (canStore && !unchanged && !trySet(store, CONTENT_MANIFEST_KEY, reply.text)) {
    summary.persisted = false;
  }

  await fetchEntries(deps, remote, summary, canStore);
  if (canStore) {
    removeVanished(
      store,
      previousText === null ? null : parseCachedManifest(previousText),
      remote,
      summary,
    );
  }
  return summary;
}

export async function refreshEpisodeCatalog(deps: RefreshDeps): Promise<RefreshSummary> {
  try {
    return await refresh(deps);
  } catch {
    return emptySummary("invalid", false);
  }
}
