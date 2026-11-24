// 사진 스토리의 뒷정리(ADR-0191 D11) — 매분 도는 반응 함수(`companion-story-reactions`)가 부른다. 던지지 않는다.
// 1. 파일 정리: 지운 스토리의 사진 · 기한이 지난 거절의 격리 파일(`companion_my_story_file_purges`)을 저장소에서 지운다.
// 2. 다시 보기: 제때 읽지 못해 `checking`으로 올라간 스토리를 한 번에 셋까지 다시 읽어 게시 · 거절을 정한다. **읽지 못한 사진은 게시하지
//    않는다** — 서버가 간격을 늘려 가며 24시간 동안 다시 고르고, 끝내 못 읽으면 지운다. 사진이 사라졌으면(지움 · 올리지 못함) 스토리를 지운다.

import { readStoryPhoto } from "./companion-my-story-post.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import type { StoryReader } from "./companion-story-read.ts";
import {
  downloadStoryPhoto,
  quarantineStoryPhoto,
  removeStoryFiles,
  type StoryFetch,
} from "./companion-story-storage.ts";
import type { Outbound } from "./delete-account.contract.ts";

export const STORY_CHECK_BATCH = 3;
/** 다시 볼 때의 읽기 제한 시간 — 올릴 때(8초)보다 넉넉히. 사용자가 기다리지 않는다. 서버는 90초 안에는 같은 줄을 다시 고르지 않는다. */
export const STORY_RECHECK_TIMEOUT_MS = 30_000;
export const STORY_PURGE_BATCH = 100;
const STORAGE_TIMEOUT_MS = 10_000;

export type UpkeepDeps = {
  readonly outbound: Outbound;
  readonly fetch: StoryFetch;
  /** 사진 읽기. 없으면(키 없음) 다시 보기는 건너뛴다. */
  readonly reader: StoryReader | null;
  readonly readTimeoutMs?: number;
};
export type UpkeepResult = { readonly purged: number; readonly checked: number };

type Purge = { id?: unknown; bucket?: unknown; path?: unknown };
type Check = { storyId?: unknown; imagePath?: unknown; ko?: unknown; overlays?: unknown };

async function purgeFiles(deps: UpkeepDeps, env: RpcEnv, now: string): Promise<number> {
  const rows =
    (await callRpc<Purge[] | null>(deps.outbound, env, "companion_my_story_file_purges", {
      p_now: now,
      p_limit: STORY_PURGE_BATCH,
    })) ?? [];
  const byBucket = new Map<string, { ids: number[]; paths: string[] }>();
  for (const row of rows) {
    if (
      typeof row.id !== "number" ||
      typeof row.bucket !== "string" ||
      typeof row.path !== "string"
    )
      continue;
    const group = byBucket.get(row.bucket) ?? { ids: [], paths: [] };
    group.ids.push(row.id);
    group.paths.push(row.path);
    byBucket.set(row.bucket, group);
  }
  const done: number[] = [];
  for (const [bucket, group] of byBucket) {
    if (await removeStoryFiles(deps.fetch, env, bucket, group.paths, STORAGE_TIMEOUT_MS))
      done.push(...group.ids);
  }
  if (done.length > 0)
    await callRpc(deps.outbound, env, "companion_done_my_story_file_purges", { p_ids: done });
  return done.length;
}

const overlayWords = (overlays: unknown): string[] =>
  Array.isArray(overlays)
    ? overlays.flatMap((overlay) => {
        const ko = (overlay as { ko?: unknown } | null)?.ko;
        return typeof ko === "string" && ko.trim() !== "" ? [ko.trim()] : [];
      })
    : [];

async function recheck(
  deps: UpkeepDeps,
  reader: StoryReader,
  env: RpcEnv,
  row: Check,
  now: string,
): Promise<void> {
  if (typeof row.storyId !== "string" || typeof row.imagePath !== "string") return;
  const resolve = (verdict: string, extra: Record<string, unknown> = {}) =>
    callRpc(deps.outbound, env, "companion_resolve_my_story_check", {
      p_story_id: row.storyId,
      p_verdict: verdict,
      p_scene: null,
      p_category: null,
      p_quarantine_path: null,
      p_now: now,
      ...extra,
    });
  const photo = await downloadStoryPhoto(deps.fetch, env, row.imagePath, STORAGE_TIMEOUT_MS);
  if (photo === null) {
    // 사진이 없으면 읽을 수 없다 — 읽지 못한 스토리는 게시하지 않으므로 지운다.
    await resolve("drop");
    return;
  }
  const read = await readStoryPhoto(
    { reader, readTimeoutMs: deps.readTimeoutMs ?? STORY_RECHECK_TIMEOUT_MS },
    { photo, line: typeof row.ko === "string" ? row.ko : "", overlays: overlayWords(row.overlays) },
  );
  if (read === null) return; // 다음 회차에 다시 — 시도 수는 서버가 셌다.
  if (read.verdict === "ok") {
    await resolve("live", { p_scene: read.scene });
    return;
  }
  const path = await quarantineStoryPhoto(
    deps.fetch,
    env,
    row.imagePath,
    photo,
    STORAGE_TIMEOUT_MS,
  );
  await resolve("rejected", { p_category: read.category, p_quarantine_path: path });
}

export async function storyUpkeep(
  deps: UpkeepDeps,
  env: RpcEnv,
  now: string,
): Promise<UpkeepResult> {
  let purged = 0;
  let checked = 0;
  try {
    purged = await purgeFiles(deps, env, now);
  } catch {
    // 다음 회차에 다시.
  }
  if (deps.reader === null) return { purged, checked };
  try {
    const rows =
      (await callRpc<Check[] | null>(deps.outbound, env, "companion_my_story_checks_due", {
        p_now: now,
        p_limit: STORY_CHECK_BATCH,
      })) ?? [];
    const reader = deps.reader;
    const results = await Promise.allSettled(
      rows.map((row) => recheck(deps, reader, env, row, now)),
    );
    // 실패한 스토리는 다음 회차에 다시.
    checked = results.filter((result) => result.status === "fulfilled").length;
  } catch {
    // 다음 회차에 다시.
  }
  return { purged, checked };
}
