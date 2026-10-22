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
};

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
): boolean {
  try {
    store.set(markerKey ?? contentAssetsKey(id), JSON.stringify({ sha256, missing }));
    return true;
  } catch {
    return false;
  }
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
  if (isAssetsComplete(store, entry.id, entry.sha256, markerKey)) return "already";
  const result = await syncEpisodeAssets(deps, paths, options?.onPathSettled);
  if (result.state === "incomplete") return "incomplete";
  return markAssetsComplete(store, entry.id, entry.sha256, result.missing, markerKey)
    ? "completed"
    : "incomplete";
}
