import "background-only";

// 에피소드 하나의 자산을 「공통 → 유닛(스텝 순)」 묶음으로 받고 묶음마다 받음 표시를 둡니다. 던지지 않습니다.
// 묶음 안의 받기 · 「서버에 없음」 규칙은 `syncEpisodeAssets` 그대로이고, 편 표시는 모든 묶음이 끝났을 때만 씁니다.
import type { CatalogUnitKey } from "./catalog-progress";
import type { AssetTarget } from "./download-policy";
import {
  contentAssetsKey,
  ensureEpisodeAssets,
  markAssetsComplete,
  readAssetMarkerMissing,
  syncEpisodeAssets,
} from "./episode-asset-sync";
import type { AssetDeps, EnsureOutcome } from "./episode-asset-sync";
import type { EpisodeAssetGroups } from "./episode-assets";
import type { ContentStore } from "./episode-cache";

/** 공통 묶음의 받음 표시 — `{sha256, missing}`(편 표시와 같은 모양). */
export const contentCommonAssetsKey = (id: string): string => `libitum.content.assets.${id}.common`;

/** 유닛 묶음의 받음 표시 — 키는 스텝 id 그대로. */
export const contentUnitAssetsKey = (id: string, unitKey: CatalogUnitKey): string =>
  `libitum.content.assets.${id}.unit.${unitKey}`;

/** `deferred` = 정책이 묶음 하나라도 막아 편 표시를 쓰지 않았다(실패 아님). */
export type EnsureGroupsOutcome = EnsureOutcome | "deferred";

export type AssetGroupSyncOptions = {
  /** 편 표시를 둘 키 — 없으면 `contentAssetsKey(id)`, 스테이징이면 `contentStagedAssetsKey(id)`. */
  readonly markerKey?: string;
  /** 묶음 표시를 쓰는가 — 활성 받기 `"active"`, 스테이징 `"none"`(편 표시만). */
  readonly groupMarkers: "active" | "none";
  /** 묶음마다 받아도 되는가 — 없으면 전부 허락. 던지면 허락으로 봅니다. */
  readonly allowed?: (target: AssetTarget) => boolean;
  /** 경로 하나가 끝날 때마다 — 겹친 경로는 묶음마다 불립니다. */
  readonly onPathSettled?: (path: string) => void;
  readonly now?: () => number;
  readonly recheckMissing?: boolean;
};

type Entry = { readonly id: string; readonly sha256: string };

type Group = {
  readonly target: AssetTarget;
  readonly paths: readonly string[];
  readonly markerKey: string;
};

function isAllowed(options: AssetGroupSyncOptions, target: AssetTarget): boolean {
  try {
    return options.allowed?.(target) ?? true;
  } catch {
    return true;
  }
}

function groupsOf(id: string, groups: EpisodeAssetGroups): readonly Group[] {
  return [
    { target: { kind: "common" }, paths: groups.common, markerKey: contentCommonAssetsKey(id) },
    ...groups.units.map((unit): Group => ({
      target: { kind: "unit", unitKey: unit.key },
      paths: unit.paths,
      markerKey: contentUnitAssetsKey(id, unit.key),
    })),
  ];
}

export async function ensureEpisodeAssetGroups(
  store: ContentStore,
  deps: AssetDeps,
  entry: Entry,
  groups: EpisodeAssetGroups,
  options: AssetGroupSyncOptions,
): Promise<EnsureGroupsOutcome> {
  const { markerKey } = options;
  const now = (options.now ?? Date.now)();
  const active = options.groupMarkers === "active";
  const editKey = markerKey ?? contentAssetsKey(entry.id);
  if (readAssetMarkerMissing(store, editKey, entry.sha256) !== null) {
    await ensureEpisodeAssets(store, deps, entry, [], {
      ...(markerKey === undefined ? {} : { markerKey }),
      ...(options.recheckMissing === undefined ? {} : { recheckMissing: options.recheckMissing }),
      now: () => now,
    });
    return "already";
  }

  const missing = new Set<string>();
  // 앞 묶음에서 받은 경로는 파일 확인이 늦거나 없어도 다시 받지 않습니다(겹친 경로는 한 번만).
  const received = new Set<string>();
  const seen: AssetDeps = { ...deps, has: (path) => received.has(path) || deps.has(path) };
  let deferred = false;
  for (const group of groupsOf(entry.id, groups)) {
    // 이미 다 받아 둔 묶음은 받을 것이 없으니 허락을 묻지 않습니다.
    const blocked =
      !isAllowed(options, group.target) && !group.paths.every((path) => seen.has(path));
    if (blocked) {
      // 공통이 막히면 유닛도 받지 않습니다 — 공통이 먼저입니다.
      if (group.target.kind === "common") return "deferred";
      deferred = true;
      continue;
    }
    const marked = active ? readAssetMarkerMissing(store, group.markerKey, entry.sha256) : null;
    if (marked !== null) {
      for (const path of marked) missing.add(path);
      continue;
    }
    const result = await syncEpisodeAssets(seen, group.paths, options.onPathSettled);
    if (result.state === "incomplete") return "incomplete";
    for (const path of result.missing) missing.add(path);
    for (const path of group.paths) if (!result.missing.includes(path)) received.add(path);
    if (active) markAssetsComplete(store, entry.id, entry.sha256, result.missing, group.markerKey);
  }
  if (deferred) return "deferred";
  return markAssetsComplete(store, entry.id, entry.sha256, [...missing], markerKey, now)
    ? "completed"
    : "incomplete";
}
