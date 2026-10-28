import "background-only";

// 백그라운드 갱신 — 원격 매니페스트 → 바뀐 에피소드만 받기 → 검증 → 캐시. 던지지 않습니다.
import { contentManifestPathsFor } from "./content-manifest-path";
import { ABSENT_HTTP_CODES } from "./episode-asset-sync";
import type { AssetDeps } from "./episode-asset-sync";
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
import {
  CONTENT_CLIENT_LEVEL,
  SUPPORTED_EPISODE_SCHEMAS,
  parseCachedManifest,
} from "./episode-catalog";
import type { CatalogInput, LockReason } from "./episode-catalog";
import { decodeManifest } from "./episode-manifest";
import type { EpisodeManifest, ManifestEntry } from "./episode-manifest";
import { runPlannedEpisode } from "./episode-refresh-entry";
import type { PlannedEpisodeRun } from "./episode-refresh-entry";
import type { FetchText, FetchTextResult } from "./episode-remote";
import {
  composeActiveManifestText,
  discardStagedEpisode,
  readStagedEpisode,
} from "./episode-staging";
import {
  activeReadyIds,
  planEpisodeUpdates,
  splashEpisodeIds,
  winsOverBundled,
} from "./episode-update-plan";
import type { PlannedEpisode } from "./episode-update-plan";

export type RefreshSummary = {
  manifest: "updated" | "unchanged" | "unavailable" | "invalid";
  fetched: string[];
  locked: { id: string; reason: LockReason }[];
  failed: { id: string; reason: "network" | "http" }[];
  removed: string[];
  persisted: boolean;
};

/** 실행 시작의 받기를 스플래시가 지켜보는 자리입니다. 없으면 아무도 지켜보지 않습니다. */
export type RefreshObserver = {
  /** 차례를 정한 직후 한 번 — 스플래시가 기다릴 id(new · changed), 계획 순서. 매니페스트를 못 받으면 부르지 않습니다. */
  readonly planned: (ids: readonly string[]) => void;
  /** 기다리는 에피소드 하나의 파일 진행 — 0 < done ≤ total, total = 본문 1 + 자산 경로 수. 줄지 않습니다. */
  readonly progressed: (id: string, done: number, total: number) => void;
  /** 기다리는 에피소드 하나가 다 갖춰짐(new는 열림, changed는 교체 준비됨). */
  readonly ready: (id: string) => void;
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
  /** 바뀐 에피소드의 스테이징이 본문 + 자산까지 갖춰진 순간 그 id로 한 번 부릅니다 — 교체할 수 있는 때입니다. */
  onEpisodeStaged?: (id: string) => void;
  /** 실행 시작의 첫 차례에 스플래시가 붙이는 관찰자입니다. */
  observer?: RefreshObserver;
  /** 차례로 시도할 매니페스트 경로입니다. 없으면 이 앱의 수준(`CONTENT_CLIENT_LEVEL`)으로 정합니다(ADR-0087). */
  manifestPaths?: readonly string[];
};

function emptySummary(manifest: RefreshSummary["manifest"], persisted: boolean): RefreshSummary {
  return { manifest, fetched: [], locked: [], failed: [], removed: [], persisted };
}

/** 전송 호출 하나가 reject하면 그 호출만 연결 실패로 봅니다. */
async function safeFetch(fetchText: FetchText, relative: string): Promise<FetchTextResult> {
  try {
    return await fetchText(relative, { kind: "fresh" });
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * 매니페스트를 경로 차례대로 받습니다. 서버에 없는 경로(400 · 403 · 404 · 410)만 다음으로 넘어가고, 연결 실패 ·
 * 다른 응답은 거기서 멈춥니다 — 수준 2 앱이 연결이 흔들린 틈에 수준 1 매니페스트를 받는 일이 없습니다.
 */
async function fetchManifest(
  fetchText: FetchText,
  paths: readonly string[],
): Promise<FetchTextResult> {
  let reply: FetchTextResult = { ok: false, reason: "network" };
  for (const path of paths) {
    reply = await safeFetch(fetchText, path);
    if (!reply.ok || !ABSENT_HTTP_CODES.has(reply.status)) return reply;
  }
  return reply;
}

function parseManifestText(text: string): EpisodeManifest | null {
  try {
    const decoded = decodeManifest(JSON.parse(text));
    return decoded.ok ? decoded.manifest : null;
  } catch {
    return null;
  }
}

/** 잠길 원격 항목을 보고합니다 — 계획에는 들어가지 않습니다. */
function reportLocked(deps: RefreshDeps, remote: EpisodeManifest, summary: RefreshSummary): void {
  const tooOld = (remote.minClientLevel ?? 0) > CONTENT_CLIENT_LEVEL;
  for (const entry of remote.episodes) {
    if (!winsOverBundled(entry, deps.bundled.manifest)) continue;
    if (tooOld) {
      summary.locked.push({ id: entry.id, reason: "client-too-old" });
    } else if (!SUPPORTED_EPISODE_SCHEMAS.includes(entry.schema)) {
      summary.locked.push({ id: entry.id, reason: "unsupported-schema" });
    }
  }
}

/** 새 매니페스트를 씁니다 — 보류한(changed) id는 활성 항목을 지키고 받은 원문은 따로 둡니다. */
function writeManifests(
  store: ContentStore,
  received: { readonly text: string; readonly manifest: EpisodeManifest },
  active: EpisodeManifest | null,
  held: ReadonlySet<string>,
  summary: RefreshSummary,
): void {
  const overrides = new Map<string, ManifestEntry | null>();
  for (const id of held) {
    overrides.set(id, active?.episodes.find((entry) => entry.id === id) ?? null);
  }
  if (overrides.size === 0) {
    if (!trySet(store, CONTENT_MANIFEST_KEY, received.text)) summary.persisted = false;
    if (safeGet(store, CONTENT_RECEIVED_MANIFEST_KEY) !== null) {
      if (!tryRemove(store, CONTENT_RECEIVED_MANIFEST_KEY)) summary.persisted = false;
    }
    return;
  }
  if (!trySet(store, CONTENT_RECEIVED_MANIFEST_KEY, received.text)) summary.persisted = false;
  if (!trySet(store, CONTENT_MANIFEST_KEY, composeActiveManifestText(received, overrides))) {
    summary.persisted = false;
  }
}

/** 이번 받은 매니페스트에서 더는 새 버전이 아닌 id의 낡은 스테이징 셋을 지웁니다. */
function discardStale(
  store: ContentStore,
  plan: readonly PlannedEpisode[],
  summary: RefreshSummary,
) {
  for (const { entry, kind } of plan) {
    const staged = kind === "changed" ? readStagedEpisode(store, entry.id) : null;
    if (staged !== null && staged.entry.sha256 === entry.sha256) continue;
    if (!discardStagedEpisode(store, entry.id)) summary.persisted = false;
  }
}

/**
 * 에피소드를 **하나씩** 받습니다 — 원격 본문 → 그 에피소드의 자산(4개까지 동시에) → 다음 에피소드. 새 · 바뀐
 * 에피소드를 `order` 순으로 먼저 받습니다. 본문을 못 받은 에피소드는 건너뛰고(지금 규칙), 자산을 못 갖춘
 * 에피소드에서는 멈춥니다 — 다음 기회(연결 · 포그라운드 복귀)에 그 자리부터 이어 받습니다(ADR-0071).
 */
async function runPlan(run: PlannedEpisodeRun, plan: readonly PlannedEpisode[]): Promise<void> {
  for (const planned of plan) {
    if ((await runPlannedEpisode(run, planned)) === "stop") return;
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
    if (!discardStagedEpisode(store, entry.id)) {
      summary.persisted = false;
    }
    if (tryRemove(store, contentEpisodeKey(entry.id))) {
      summary.removed.push(entry.id);
    } else {
      summary.persisted = false;
    }
  }
}

async function refresh(deps: RefreshDeps): Promise<RefreshSummary> {
  const { fetchText, store, bundled } = deps;
  const canStore = safeAvailable(store);

  const paths = deps.manifestPaths ?? contentManifestPathsFor(CONTENT_CLIENT_LEVEL);
  const reply = await fetchManifest(fetchText, paths);
  if (!reply.ok || reply.status !== 200) {
    return emptySummary("unavailable", canStore);
  }
  const remote = parseManifestText(reply.text);
  if (remote === null) {
    return emptySummary("invalid", canStore);
  }

  const activeText = canStore ? safeGet(store, CONTENT_MANIFEST_KEY) : null;
  const previousText = canStore
    ? (safeGet(store, CONTENT_RECEIVED_MANIFEST_KEY) ?? activeText)
    : null;
  const unchanged = previousText === reply.text;
  const summary = emptySummary(unchanged ? "unchanged" : "updated", canStore);
  const staging = deps.assets !== undefined && canStore ? "available" : "unavailable";
  const active = parseCachedManifest(activeText);

  const plan = planEpisodeUpdates({
    bundled: bundled.manifest,
    received: remote,
    active,
    activeReady: activeReadyIds(
      store,
      active,
      bundled.manifest,
      deps.assets === undefined ? "not-required" : "required",
    ),
  });
  if (canStore && !unchanged) {
    const held = new Set(
      staging === "available"
        ? plan.filter((planned) => planned.kind === "changed").map((planned) => planned.entry.id)
        : [],
    );
    writeManifests(store, { text: reply.text, manifest: remote }, active, held, summary);
  }

  const watched = splashEpisodeIds(plan, staging);
  deps.observer?.planned(watched);
  reportLocked(deps, remote, summary);
  if (canStore) discardStale(store, plan, summary);
  await runPlan({ deps, summary, canStore, staging, watched: new Set(watched) }, plan);
  if (canStore) {
    removeVanished(store, parseCachedManifest(previousText), remote, summary);
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
