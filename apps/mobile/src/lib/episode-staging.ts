import "background-only";

// 스테이징 셋 — 지금 열리는 에피소드의 새 버전을 활성 셋을 건드리지 않고 받아 두었다가 다음 시작에 교체합니다.
import { contentAssetsKey, isAssetsComplete } from "./episode-asset-sync";
import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
  safeAvailable,
  safeGet,
  tryRemove,
  trySet,
} from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import { parseCachedManifest } from "./episode-catalog";
import { decodeManifest, encodeManifestText } from "./episode-manifest";
import type { EpisodeManifest, ManifestEntry } from "./episode-manifest";
import { matchesEntry } from "./episode-update-plan";

export const contentStagedEpisodeKey = (id: string): string =>
  `libitum.content.staged.episode.${id}`;
export const contentStagedEntryKey = (id: string): string => `libitum.content.staged.entry.${id}`;
export const contentStagedAssetsKey = (id: string): string => `libitum.content.staged.assets.${id}`;

export type StagedEpisode = {
  readonly entry: ManifestEntry;
  readonly text: string;
  /** 스테이징 표시가 그 항목 sha의 것인가. */
  readonly assets: "complete" | "incomplete";
};

function parseEntry(text: string | null): ManifestEntry | null {
  if (text === null) return null;
  try {
    const decoded = decodeManifest({
      schema: "manifest-1",
      generated_at: "",
      episodes: [JSON.parse(text)],
    });
    return decoded.ok ? (decoded.manifest.episodes[0] ?? null) : null;
  } catch {
    return null;
  }
}

/** 항목이 디코드되고 본문이 그 항목과 맞을 때만 냅니다. 아니면 null(지우지 않음). */
export function readStagedEpisode(store: ContentStore, id: string): StagedEpisode | null {
  const entry = parseEntry(safeGet(store, contentStagedEntryKey(id)));
  if (entry === null || entry.id !== id) return null;
  const text = safeGet(store, contentStagedEpisodeKey(id));
  if (text === null || !matchesEntry(entry, text)) return null;
  const complete = isAssetsComplete(store, id, entry.sha256, contentStagedAssetsKey(id));
  return { entry, text, assets: complete ? "complete" : "incomplete" };
}

/** 본문 → 항목 순으로 씁니다. 하나라도 실패하면 false. */
export function writeStagedEpisode(
  store: ContentStore,
  entry: ManifestEntry,
  text: string,
): boolean {
  return (
    trySet(store, contentStagedEpisodeKey(entry.id), text) &&
    trySet(store, contentStagedEntryKey(entry.id), JSON.stringify(entry))
  );
}

/** 스테이징 셋 가운데 있는 키만 지웁니다. 하나라도 실패하면 false. */
export function discardStagedEpisode(store: ContentStore, id: string): boolean {
  let removed = true;
  for (const key of [
    contentStagedEpisodeKey(id),
    contentStagedEntryKey(id),
    contentStagedAssetsKey(id),
  ]) {
    if (safeGet(store, key) !== null && !tryRemove(store, key)) removed = false;
  }
  return removed;
}

export type ReceivedManifest = { readonly text: string; readonly manifest: EpisodeManifest };

/** 받은 항목이 있는데 활성에 없거나 sha가 다른 id — 보류 중인 id. 순수. */
export function heldEpisodeIds(
  received: EpisodeManifest,
  active: EpisodeManifest | null,
): ReadonlySet<string> {
  const held = new Set<string>();
  for (const entry of received.episodes) {
    const own = active?.episodes.find((candidate) => candidate.id === entry.id);
    if (own === undefined || own.sha256 !== entry.sha256) held.add(entry.id);
  }
  return held;
}

/**
 * 활성 원문. overrides가 비면 received.text 그대로(바이트 같음). 아니면 received를 기준으로 그 id 항목을 바꾸고
 * (null이면 빼고) `encodeManifestText`로 씁니다. 순수.
 */
export function composeActiveManifestText(
  received: ReceivedManifest,
  overrides: ReadonlyMap<string, ManifestEntry | null>,
): string {
  if (overrides.size === 0) return received.text;
  const episodes: ManifestEntry[] = [];
  for (const entry of received.manifest.episodes) {
    if (!overrides.has(entry.id)) {
      episodes.push(entry);
      continue;
    }
    const replacement = overrides.get(entry.id);
    if (replacement !== null && replacement !== undefined) episodes.push(replacement);
  }
  return encodeManifestText({ ...received.manifest, episodes });
}

export type PromoteResult = { readonly promoted: readonly string[]; readonly persisted: boolean };

type Backup = { readonly id: string; readonly body: string | null; readonly marker: string | null };

function restore(store: ContentStore, key: string, old: string | null): boolean {
  return old === null ? tryRemove(store, key) : trySet(store, key, old);
}

function rollback(store: ContentStore, backups: readonly Backup[]): void {
  for (const backup of backups) {
    restore(store, contentEpisodeKey(backup.id), backup.body);
    restore(store, contentAssetsKey(backup.id), backup.marker);
  }
}

/** 한 id의 활성 본문 · 표시를 스테이징 것으로 바꿉니다. 실패하면 두 키를 되돌리고 null. */
function swapIn(store: ContentStore, staged: StagedEpisode): Backup | null {
  const id = staged.entry.id;
  const backup: Backup = {
    id,
    body: safeGet(store, contentEpisodeKey(id)),
    marker: safeGet(store, contentAssetsKey(id)),
  };
  const marker = safeGet(store, contentStagedAssetsKey(id));
  if (
    marker !== null &&
    trySet(store, contentEpisodeKey(id), staged.text) &&
    trySet(store, contentAssetsKey(id), marker)
  ) {
    return backup;
  }
  rollback(store, [backup]);
  return null;
}

/** 준비된 스테이징을 활성으로 올립니다. 동기 · 던지지 않음. */
export function promoteStagedEpisodes(store: ContentStore): PromoteResult {
  if (!safeAvailable(store)) return { promoted: [], persisted: true };
  const activeText = safeGet(store, CONTENT_MANIFEST_KEY);
  const receivedKey = safeGet(store, CONTENT_RECEIVED_MANIFEST_KEY);
  const receivedText = receivedKey ?? activeText;
  if (receivedText === null) return { promoted: [], persisted: true };
  const manifest = parseCachedManifest(receivedText);
  if (manifest === null) return { promoted: [], persisted: true };
  const active = parseCachedManifest(activeText);
  const received: ReceivedManifest = { text: receivedText, manifest };

  let persisted = true;
  const backups: Backup[] = [];
  const staged = new Map<string, StagedEpisode>();
  const ids = new Set<string>(
    [...manifest.episodes, ...(active?.episodes ?? [])].map((entry) => entry.id),
  );
  for (const id of [...ids].sort()) {
    const ready = readStagedEpisode(store, id);
    if (ready === null || ready.assets !== "complete") continue;
    const own = manifest.episodes.find((entry) => entry.id === id);
    if (receivedKey !== null && own?.sha256 !== ready.entry.sha256) {
      if (own !== undefined && !discardStagedEpisode(store, id)) persisted = false;
      continue;
    }
    const backup = swapIn(store, ready);
    if (backup === null) {
      persisted = false;
      continue;
    }
    backups.push(backup);
    staged.set(id, ready);
  }
  if (backups.length === 0) return { promoted: [], persisted };

  const overrides = new Map<string, ManifestEntry | null>();
  for (const id of heldEpisodeIds(manifest, active)) {
    if (staged.has(id)) continue;
    overrides.set(id, active?.episodes.find((entry) => entry.id === id) ?? null);
  }
  for (const [id, ready] of staged) {
    const own = manifest.episodes.find((entry) => entry.id === id);
    if (own !== undefined && own.sha256 !== ready.entry.sha256) overrides.set(id, ready.entry);
  }
  if (!trySet(store, CONTENT_MANIFEST_KEY, composeActiveManifestText(received, overrides))) {
    rollback(store, backups);
    return { promoted: [], persisted: false };
  }
  if (
    overrides.size === 0 &&
    receivedKey !== null &&
    !tryRemove(store, CONTENT_RECEIVED_MANIFEST_KEY)
  ) {
    persisted = false;
  }
  for (const id of staged.keys()) {
    if (!discardStagedEpisode(store, id)) persisted = false;
  }
  const order = new Map(manifest.episodes.map((entry) => [entry.id, entry.order] as const));
  const promoted = [...staged.keys()].sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0) || (a < b ? -1 : 1),
  );
  return { promoted, persisted };
}
