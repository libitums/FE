import "background-only";

// 에피소드 하나의 자산(이미지 · 음성)을 4개까지 동시에 받아 두는 규칙과 완료 표시입니다. 던지지 않습니다.
//
// 실패를 둘로 가릅니다. **서버에 없다고 확정된 것**(400 · 403 · 404 · 410)은 적어 두고 넘어갑니다 — 녹음하지 않은
// 줄 하나 때문에 에피소드가 영영 「준비 중」에 묶이지 않게 합니다. **그 밖의 실패**(연결 · 입출력 · 5xx …)는
// 새로 시작하지 않고 진행 중인 것은 끝까지 받은 뒤 다음 기회(연결 · 포그라운드 복귀)에 이어 받습니다 — 받아 둔
// 파일은 남으므로 이어 받기는 남은 것부터입니다. 에피소드 사이는 겹치지 않습니다.
import type { ContentStore } from "./episode-cache";

export type DownloadResult =
  | { status: "saved" }
  | { status: "http"; code: number }
  | { status: "network" | "invalid" | "io" | "unavailable" };

export type AssetDeps = {
  /** 받아 둔 파일이 있는가. */
  has(path: string): boolean;
  download(url: string, path: string): Promise<DownloadResult>;
  /** 버킷 상대 경로의 원격 주소입니다. 설정이 없으면 `null`입니다. */
  remoteUrlOf(path: string): string | null;
};

export type AssetSyncResult = { state: "complete"; missing: string[] } | { state: "incomplete" };

export type AssetSyncOptions = {
  /** 완료 표시를 둘 키입니다. 없으면 활성 표시 `contentAssetsKey(entry.id)`. */
  readonly markerKey?: string;
  /** 경로 하나가 끝날 때마다(이미 있음 · 받음 · 서버에 없음) 부릅니다. 실패한 경로에는 부르지 않습니다. */
  readonly onPathSettled?: (path: string) => void;
  /** 확인 시각을 재는 시계입니다(테스트 주입). 없으면 `Date.now`. */
  readonly now?: () => number;
  /** 이번 차례에 매니페스트가 바뀌었는가 — 그러면 시간과 상관없이 「서버에 없음」을 다시 봅니다(ADR-0095 D2). */
  readonly recheckMissing?: boolean;
};

/** 「서버에 없음」으로 적힌 경로를 다시 보는 간격입니다(ADR-0095 D2). */
export const MISSING_RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const contentAssetsKey = (id: string): string => `libitum.content.assets.${id}`;

// Supabase Storage는 없는 파일에 404가 아니라 400을 냅니다(본문 `{"statusCode":"404","error":"not_found"}`, 기기 관찰
// 2026-10-19 — `audio/u03-mina/d-01.m4a`). 호스트는 상태 코드만 넘기므로 400도 「서버에 없음」으로 봅니다.
export const ABSENT_HTTP_CODES: ReadonlySet<number> = new Set([400, 403, 404, 410]);

/** 에피소드 하나의 자산을 동시에 받는 최대 개수입니다. 에피소드 사이는 겹치지 않습니다. */
export const CONTENT_DOWNLOAD_CONCURRENCY = 4;

async function safeDownload(deps: AssetDeps, url: string, path: string): Promise<DownloadResult> {
  try {
    return await deps.download(url, path);
  } catch {
    return { status: "io" };
  }
}

function notify(onPathSettled: ((path: string) => void) | undefined, path: string): void {
  try {
    onPathSettled?.(path);
  } catch {
    // 관찰자의 오류가 받기를 멈추지 않습니다.
  }
}

export async function syncEpisodeAssets(
  deps: AssetDeps,
  paths: readonly string[],
  onPathSettled?: (path: string) => void,
): Promise<AssetSyncResult> {
  const unique = [...new Set(paths)];
  const pending: string[] = [];
  for (const path of unique) {
    if (deps.has(path)) notify(onPathSettled, path);
    else pending.push(path);
  }
  const absent = new Set<string>();
  let failed = false;
  let next = 0;

  async function worker(): Promise<void> {
    while (!failed && next < pending.length) {
      const path = pending[next];
      next += 1;
      if (path === undefined) return;
      const url = deps.remoteUrlOf(path);
      if (url === null) {
        failed = true;
        return;
      }
      const result = await safeDownload(deps, url, path);
      if (result.status === "saved") {
        notify(onPathSettled, path);
      } else if (result.status === "http" && ABSENT_HTTP_CODES.has(result.code)) {
        absent.add(path);
        notify(onPathSettled, path);
      } else {
        failed = true;
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONTENT_DOWNLOAD_CONCURRENCY, pending.length); i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (failed) return { state: "incomplete" };
  return { state: "complete", missing: unique.filter((path) => absent.has(path)) };
}

/** 표시는 그 에피소드 본문의 sha256과 함께 둡니다 — 본문이 바뀌면(새 version) 자산을 다시 확인합니다. */
export function isAssetsComplete(
  store: ContentStore,
  id: string,
  sha256: string,
  markerKey?: string,
): boolean {
  try {
    const text = store.get(markerKey ?? contentAssetsKey(id));
    if (text === null) return false;
    const marker = JSON.parse(text) as { sha256?: unknown };
    return marker.sha256 === sha256;
  } catch {
    return false;
  }
}

export function markAssetsComplete(
  store: ContentStore,
  id: string,
  sha256: string,
  missing: readonly string[],
  markerKey?: string,
  checkedAt?: number,
): boolean {
  try {
    // 확인 시각은 다시 볼 것(「서버에 없음」)이 있을 때만 씁니다 — 다 받은 표시는 바이트가 그대로입니다.
    const marker =
      checkedAt === undefined || missing.length === 0
        ? { sha256, missing }
        : { sha256, missing, checkedAt };
    store.set(markerKey ?? contentAssetsKey(id), JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

/** 다시 볼 「서버에 없음」 경로 — 그 본문의 표시이고 간격 · 매니페스트 변경 · 옛 표시 조건이 맞을 때만. 던지지 않음. */
function missingDueForRecheck(
  store: ContentStore,
  key: string,
  sha256: string,
  now: number,
  recheck: boolean,
): readonly string[] {
  try {
    const text = store.get(key);
    if (text === null) return [];
    const marker = JSON.parse(text) as { sha256?: unknown; missing?: unknown; checkedAt?: unknown };
    if (marker.sha256 !== sha256 || !Array.isArray(marker.missing)) return [];
    const missing = marker.missing.filter((path): path is string => typeof path === "string");
    if (missing.length === 0) return [];
    const checkedAt = typeof marker.checkedAt === "number" ? marker.checkedAt : null;
    const due = recheck || checkedAt === null || now - checkedAt >= MISSING_RECHECK_INTERVAL_MS;
    return due ? missing : [];
  } catch {
    return [];
  }
}

/**
 * 「서버에 없음」 경로만 다시 받습니다. 끝까지 받았으면 아직 없는 것만 남겨 표시를 새로 쓰고, 연결이 끊기면 표시를
 * 그대로 둡니다(다음 차례에 다시). 열림 판정은 sha만 보므로 이 함수가 바꾸지 않습니다.
 */
async function recheckMissing(
  store: ContentStore,
  deps: AssetDeps,
  entry: { readonly id: string; readonly sha256: string },
  missing: readonly string[],
  markerKey: string | undefined,
  now: number,
): Promise<void> {
  const result = await syncEpisodeAssets(deps, missing);
  if (result.state === "incomplete") return;
  markAssetsComplete(store, entry.id, entry.sha256, result.missing, markerKey, now);
}

export type EnsureOutcome = "already" | "completed" | "incomplete";

/**
 * 에피소드 하나의 자산을 갖춥니다. 표시가 이미 그 본문(sha256)의 것이면 `already`, 이번에 다 갖추고 표시를
 * 썼으면 `completed`, 못 갖췄거나 표시를 못 썼으면 `incomplete`입니다.
 */
export async function ensureEpisodeAssets(
  store: ContentStore,
  deps: AssetDeps,
  entry: { readonly id: string; readonly sha256: string },
  paths: readonly string[],
  options?: AssetSyncOptions,
): Promise<EnsureOutcome> {
  const markerKey = options?.markerKey;
  const now = (options?.now ?? Date.now)();
  if (isAssetsComplete(store, entry.id, entry.sha256, markerKey)) {
    const key = markerKey ?? contentAssetsKey(entry.id);
    const due = missingDueForRecheck(
      store,
      key,
      entry.sha256,
      now,
      options?.recheckMissing === true,
    );
    if (due.length > 0) await recheckMissing(store, deps, entry, due, markerKey, now);
    return "already";
  }
  const result = await syncEpisodeAssets(deps, paths, options?.onPathSettled);
  if (result.state === "incomplete") return "incomplete";
  return markAssetsComplete(store, entry.id, entry.sha256, result.missing, markerKey, now)
    ? "completed"
    : "incomplete";
}

/** 표시가 그 sha의 것이면 그 `missing`(문자열만), 아니면 `null`. 던지지 않음. */
export function readAssetMarkerMissing(
  store: ContentStore,
  key: string,
  sha256: string,
): readonly string[] | null {
  try {
    const text = store.get(key);
    if (text === null) return null;
    const marker = JSON.parse(text) as { sha256?: unknown; missing?: unknown };
    if (marker.sha256 !== sha256) return null;
    if (!Array.isArray(marker.missing)) return [];
    return marker.missing.filter((path): path is string => typeof path === "string");
  } catch {
    return null;
  }
}
