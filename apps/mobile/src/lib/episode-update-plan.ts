import "background-only";

// 에피소드 갱신 분류 — 받은 매니페스트의 항목을 new · changed · current · bundled로 가르고 받을 차례를 정합니다.
import { isAssetsComplete } from "./episode-asset-sync";
import { contentEpisodeKey, safeGet } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import {
  CONTENT_CLIENT_LEVEL,
  SUPPORTED_EPISODE_SCHEMAS,
  compareVersions,
} from "./episode-catalog";
import type { EpisodeManifest, ManifestEntry } from "./episode-manifest";
import { sha256Hex, utf8Bytes } from "./sha256";

export type EpisodeUpdateKind = "new" | "changed" | "current" | "bundled";
export type PlannedEpisode = { readonly entry: ManifestEntry; readonly kind: EpisodeUpdateKind };
export type EpisodeUpdatePlanInput = {
  readonly bundled: EpisodeManifest;
  readonly received: EpisodeManifest;
  readonly active: EpisodeManifest | null;
  /** 활성 원격 본문이 지금 열리는 id(`activeReadyIds`). */
  readonly activeReady: ReadonlySet<string>;
};

/** 원격 항목이 내장을 이기는가 — 내장에 없거나 version이 높을 때. */
export function winsOverBundled(entry: ManifestEntry, bundled: EpisodeManifest): boolean {
  const own = bundled.episodes.find((candidate) => candidate.id === entry.id);
  return own === undefined || compareVersions(entry.version, own.version) > 0;
}

/** 원문이 항목의 bytes · sha256과 맞는가(디코드하지 않음). */
export function matchesEntry(entry: ManifestEntry, text: string): boolean {
  const bytes = utf8Bytes(text);
  return bytes.length === entry.bytes && sha256Hex(bytes) === entry.sha256;
}

/** 활성 매니페스트의 원격 항목 가운데 지금 열리는 id. assets가 "required"면 활성 자산 표시도 그 sha여야 합니다. */
export function activeReadyIds(
  store: ContentStore,
  active: EpisodeManifest | null,
  bundled: EpisodeManifest,
  assets: "required" | "not-required",
): ReadonlySet<string> {
  const ready = new Set<string>();
  for (const entry of active?.episodes ?? []) {
    if (!winsOverBundled(entry, bundled)) continue;
    const text = safeGet(store, contentEpisodeKey(entry.id));
    if (text === null || !matchesEntry(entry, text)) continue;
    if (assets === "required" && !isAssetsComplete(store, entry.id, entry.sha256)) continue;
    ready.add(entry.id);
  }
  return ready;
}

function kindOfRemote(input: EpisodeUpdatePlanInput, entry: ManifestEntry): EpisodeUpdateKind {
  const opens = input.activeReady.has(entry.id);
  const activeEntry = input.active?.episodes.find((candidate) => candidate.id === entry.id);
  if (opens && activeEntry?.sha256 === entry.sha256) return "current";
  const bundledOpens = input.bundled.episodes.some((candidate) => candidate.id === entry.id);
  return opens || bundledOpens ? "changed" : "new";
}

const isUpdating = (planned: PlannedEpisode): boolean =>
  planned.kind === "new" || planned.kind === "changed";

function byTurn(a: PlannedEpisode, b: PlannedEpisode): number {
  const rank = Number(!isUpdating(a)) - Number(!isUpdating(b));
  if (rank !== 0) return rank;
  if (a.entry.order !== b.entry.order) return a.entry.order - b.entry.order;
  return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
}

/**
 * 받을 차례 순서의 분류입니다 — new · changed(order 순) 다음 current · bundled(order 순), 같은 order는 id 사전순.
 * 잠길 항목(지원하지 않는 스키마 · client-too-old)은 넣지 않습니다. 순수 · 던지지 않음.
 */
export function planEpisodeUpdates(input: EpisodeUpdatePlanInput): readonly PlannedEpisode[] {
  const planned = new Map<string, PlannedEpisode>();
  for (const entry of input.bundled.episodes) planned.set(entry.id, { entry, kind: "bundled" });
  const tooOld = (input.received.minClientLevel ?? 0) > CONTENT_CLIENT_LEVEL;
  for (const entry of input.received.episodes) {
    if (!winsOverBundled(entry, input.bundled)) continue;
    const locked = tooOld || !SUPPORTED_EPISODE_SCHEMAS.includes(entry.schema);
    if (locked) {
      planned.delete(entry.id);
      continue;
    }
    planned.set(entry.id, { entry, kind: kindOfRemote(input, entry) });
  }
  return [...planned.values()].sort(byTurn);
}

/** 스플래시가 기다릴 id — staging이 "available"이면 new · changed, 아니면 빈 목록. 계획 순서 그대로. */
export function splashEpisodeIds(
  plan: readonly PlannedEpisode[],
  staging: "available" | "unavailable",
): readonly string[] {
  if (staging === "unavailable") return [];
  return plan.filter(isUpdating).map((planned) => planned.entry.id);
}
