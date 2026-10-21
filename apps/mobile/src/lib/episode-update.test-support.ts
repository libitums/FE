import { bundledCatalogInput } from "./episode-bundled";
import {
  contentAssetsKey,
  isAssetsComplete,
  type AssetDeps,
  type DownloadResult,
} from "./episode-asset-sync";
import { episodeAssetPaths } from "./episode-assets";
import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  contentEpisodeKey,
  readCachedSource,
  type ContentStore,
} from "./episode-cache";
import { buildEpisodeCatalog, parseCachedManifest } from "./episode-catalog";
import { decodeManifest, type EpisodeManifest, type ManifestEntry } from "./episode-manifest";
import {
  fakeFetch,
  manifestText,
  minimalEpisode,
  ok,
  remote,
  type Remote,
  type Reply,
  type Wire,
} from "./episode-refresh.test-support";
import {
  contentStagedAssetsKey,
  contentStagedEntryKey,
  contentStagedEpisodeKey,
} from "./episode-staging";

// 갱신 스테이징 단위 테스트들이 함께 쓰는 대역입니다 — 버전이 다른 같은 id의 에피소드 · 저장소 시드 · 받기 기록 대역.
// 제품 코드가 import하지 않습니다.

export const bundledPaths: readonly string[] = bundledCatalogInput.manifest.episodes.flatMap(
  (entry) => episodeAssetPaths(bundledCatalogInput.episodes[entry.id]),
);

/** 같은 id의 버전만 다른 원격 에피소드입니다. `assets`면 이미지 하나 · 음성 하나(경로 둘)를 가집니다. */
export function versioned(
  id: string,
  order: number,
  version: string,
  title: string,
  assets: "with" | "without" = "with",
): Remote {
  const wire: Wire = {
    ...minimalEpisode(id),
    title,
    ...(assets === "with"
      ? { cover: { image_url: `content/images/${id}/c.jpg`, audio_url: `${id}/l1` } }
      : {}),
  };
  return remote(id, order, { version }, JSON.stringify(wire));
}

export const pathsOf = (id: string): string[] => [`images/${id}/c.jpg`, `audio/${id}/l1.m4a`];

export function manifestOf(remotes: readonly Remote[], extra: Wire = {}): EpisodeManifest {
  const decoded = decodeManifest(JSON.parse(manifestText([...remotes], extra)));
  if (!decoded.ok) {
    throw new Error("fixture manifest is invalid");
  }
  return decoded.manifest;
}

export function entryOf(item: Remote): ManifestEntry {
  const first = manifestOf([item]).episodes[0];
  if (first === undefined) {
    throw new Error("fixture entry is missing");
  }
  return first;
}

const idOf = (item: Remote): string => String(item.entry["id"]);
export const markerText = (item: Remote, missing: readonly string[] = []): string =>
  JSON.stringify({ sha256: item.entry["sha256"], missing });

/** 활성 셋: 매니페스트 · 본문 · 자산 표시. */
export function activeSeed(item: Remote): Record<string, string> {
  return {
    [CONTENT_MANIFEST_KEY]: manifestText([item]),
    [contentEpisodeKey(idOf(item))]: item.text,
    [contentAssetsKey(idOf(item))]: markerText(item),
  };
}

/** 스테이징 셋: 본문 · 항목, `complete`면 자산 표시까지. */
export function stagedSeed(
  item: Remote,
  state: "complete" | "incomplete" = "complete",
): Record<string, string> {
  const id = idOf(item);
  return {
    [contentStagedEpisodeKey(id)]: item.text,
    [contentStagedEntryKey(id)]: JSON.stringify(item.entry),
    ...(state === "complete" ? { [contentStagedAssetsKey(id)]: markerText(item) } : {}),
  };
}

export const receivedSeed = (remotes: readonly Remote[]): Record<string, string> => ({
  [CONTENT_RECEIVED_MANIFEST_KEY]: manifestText([...remotes]),
});

export function stagedKeys(id: string): string[] {
  return [contentStagedEpisodeKey(id), contentStagedEntryKey(id), contentStagedAssetsKey(id)];
}

/** 활성 매니페스트 원문 · 활성 본문 · 활성 자산 표시를 한 줄로 — 바이트 같음 비교용. */
export function activeBytes(data: ReadonlyMap<string, string>, id: string): (string | undefined)[] {
  return [
    data.get(CONTENT_MANIFEST_KEY),
    data.get(contentEpisodeKey(id)),
    data.get(contentAssetsKey(id)),
  ];
}

export function manifestEntryIn(text: string | undefined, id: string): ManifestEntry | undefined {
  return parseCachedManifest(text ?? null)?.episodes.find((entry) => entry.id === id);
}

/** 앱이 카탈로그를 읽는 방식 그대로 — 활성 매니페스트 · 본문 · 자산 표시로 만듭니다. */
export function catalogOf(store: ContentStore) {
  const entries = parseCachedManifest(store.get(CONTENT_MANIFEST_KEY))?.episodes ?? [];
  const keep = (id: string): boolean => {
    const entry = entries.find((candidate) => candidate.id === id);
    return entry === undefined || isAssetsComplete(store, id, entry.sha256);
  };
  const cache = readCachedSource(
    store,
    entries.map((entry) => entry.id),
    keep,
  );
  return buildEpisodeCatalog({ bundled: bundledCatalogInput, cache });
}

export const repliesFor = (remotes: readonly Remote[]): Record<string, Reply> => ({
  "manifest.json": ok(manifestText([...remotes])),
  ...Object.fromEntries(remotes.map((item) => [String(item.entry["url"]), ok(item.text)])),
});

/** 본문 받기(fetch)와 자산 받기(asset)가 한 줄에 순서대로 적히는 대역입니다. `saved`는 실행 사이에 이어집니다. */
export function recorder(
  remotes: readonly Remote[],
  answers: Record<string, DownloadResult> = {},
  saved: Set<string> = new Set(bundledPaths),
) {
  const log: string[] = [];
  const fetch = fakeFetch(repliesFor(remotes));
  const fetchText = async (relative: string) => {
    log.push(`fetch ${relative}`);
    return fetch.fetchText(relative);
  };
  const assets: AssetDeps = {
    has: (path) => saved.has(path),
    download: async (_url, path) => {
      log.push(`asset ${path}`);
      const answer = answers[path] ?? { status: "saved" };
      if (answer.status === "saved") saved.add(path);
      return answer;
    },
    remoteUrlOf: (path) => `https://cdn.example/content/${path}`,
  };
  return { log, fetchText, assets, saved };
}

/** 관찰자 호출을 한 줄씩 적는 대역입니다. */
export function observerLog() {
  const events: string[] = [];
  return {
    events,
    observer: {
      planned: (ids: readonly string[]) => void events.push(`planned:${ids.join(",")}`),
      progressed: (id: string, done: number, total: number) =>
        void events.push(`progressed:${id}:${done}/${total}`),
      ready: (id: string) => void events.push(`ready:${id}`),
    },
  };
}

/** 마이크로태스크와 한 번의 매크로태스크를 모두 흘립니다. */
export const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
