import "background-only";

// 백그라운드 갱신 — 원격 매니페스트 → 바뀐 에피소드만 받기 → 검증 → 캐시. 던지지 않습니다.
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

function hasCurrentCache(store: ContentStore, entry: ManifestEntry): boolean {
  const cached = safeGet(store, contentEpisodeKey(entry.id));
  return cached !== null && sha256Hex(utf8Bytes(cached)) === entry.sha256;
}

async function fetchEntries(
  deps: RefreshDeps,
  remote: EpisodeManifest,
  summary: RefreshSummary,
  canStore: boolean,
): Promise<void> {
  const { fetchText, store, bundled } = deps;
  const tooOld = (remote.minClientLevel ?? 0) > CONTENT_CLIENT_LEVEL;

  for (const entry of remote.episodes) {
    if (!winsOverBundled(entry, bundled.manifest)) {
      continue;
    }
    if (tooOld) {
      summary.locked.push({ id: entry.id, reason: "client-too-old" });
      continue;
    }
    if (!SUPPORTED_EPISODE_SCHEMAS.includes(entry.schema)) {
      summary.locked.push({ id: entry.id, reason: "unsupported-schema" });
      continue;
    }
    if (hasCurrentCache(store, entry)) {
      continue;
    }

    const reply = await safeFetch(fetchText, entry.url);
    if (!reply.ok) {
      summary.failed.push({ id: entry.id, reason: "network" });
      continue;
    }
    if (reply.status !== 200) {
      summary.failed.push({ id: entry.id, reason: "http" });
      continue;
    }
    const checked = checkEpisodeText(entry, reply.text);
    if (!checked.ok) {
      summary.locked.push({ id: entry.id, reason: checked.reason });
      continue;
    }
    if (canStore && !trySet(store, contentEpisodeKey(entry.id), reply.text)) {
      summary.persisted = false;
      continue;
    }
    summary.fetched.push(entry.id);
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
