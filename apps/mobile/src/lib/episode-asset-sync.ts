import "background-only";

// 에피소드 하나의 자산(이미지 · 음성)을 차례로 받아 두는 규칙과 완료 표시입니다. 던지지 않습니다.
//
// 실패를 둘로 가릅니다. **서버에 없다고 확정된 것**(400 · 403 · 404 · 410)은 적어 두고 넘어갑니다 — 녹음하지 않은
// 줄 하나 때문에 에피소드가 영영 「준비 중」에 묶이지 않게 합니다. **그 밖의 실패**(연결 · 입출력 · 5xx …)는
// 그 자리에서 멈추고 다음 기회(연결 · 포그라운드 복귀)에 이어 받습니다 — 받아 둔 파일은 남으므로 이어 받기는
// 남은 것부터입니다.
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

export const contentAssetsKey = (id: string): string => `libitum.content.assets.${id}`;

// Supabase Storage는 없는 파일에 404가 아니라 400을 냅니다(본문 `{"statusCode":"404","error":"not_found"}`, 기기 관찰
// 2026-10-19 — `audio/u03-mina/d-01.m4a`). 호스트는 상태 코드만 넘기므로 400도 「서버에 없음」으로 봅니다.
export const ABSENT_HTTP_CODES: ReadonlySet<number> = new Set([400, 403, 404, 410]);

async function safeDownload(deps: AssetDeps, url: string, path: string): Promise<DownloadResult> {
  try {
    return await deps.download(url, path);
  } catch {
    return { status: "io" };
  }
}

export async function syncEpisodeAssets(
  deps: AssetDeps,
  paths: readonly string[],
): Promise<AssetSyncResult> {
  const missing: string[] = [];
  for (const path of paths) {
    if (deps.has(path)) continue;
    const url = deps.remoteUrlOf(path);
    if (url === null) return { state: "incomplete" };
    const result = await safeDownload(deps, url, path);
    if (result.status === "saved") continue;
    if (result.status === "http" && ABSENT_HTTP_CODES.has(result.code)) {
      missing.push(path);
      continue;
    }
    return { state: "incomplete" };
  }
  return { state: "complete", missing };
}

/** 표시는 그 에피소드 본문의 sha256과 함께 둡니다 — 본문이 바뀌면(새 version) 자산을 다시 확인합니다. */
export function isAssetsComplete(store: ContentStore, id: string, sha256: string): boolean {
  try {
    const text = store.get(contentAssetsKey(id));
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
): boolean {
  try {
    store.set(contentAssetsKey(id), JSON.stringify({ sha256, missing }));
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
): Promise<EnsureOutcome> {
  if (isAssetsComplete(store, entry.id, entry.sha256)) return "already";
  const result = await syncEpisodeAssets(deps, paths);
  if (result.state === "incomplete") return "incomplete";
  return markAssetsComplete(store, entry.id, entry.sha256, result.missing)
    ? "completed"
    : "incomplete";
}
