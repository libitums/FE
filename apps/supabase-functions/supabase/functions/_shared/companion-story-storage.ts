// 내 스토리 사진의 저장소 접근(ADR-0191 D11). 서버 키로만 읽고 옮기고 지운다 — Claude SDK를 끌어오지 않는다(계정 삭제도 이 파일을 쓴다).
// - `my-story-photos/<user_id>/<파일>`: 앱이 올린 원본. 올릴 수 있는 사람만 자기 폴더에 올린다(저장소 정책).
// - `my-story-quarantine/<user_id>/<파일>`: 거절한 사진. 기한(`my_story_reject_keep_days`)까지 두었다 지운다. 서버 키만 읽는다.

import { serviceKeyHeaders } from "./service-key.ts";

export const STORY_PHOTO_BUCKET = "my-story-photos";
export const STORY_QUARANTINE_BUCKET = "my-story-quarantine";
export const STORY_BUCKETS = [STORY_PHOTO_BUCKET, STORY_QUARANTINE_BUCKET] as const;

/** 읽기 단계가 받는 사진 크기 상한 — 버킷 상한(5 MB)과 같다. 읽기 모델이 받는 이미지 한 장의 크기에 맞췄다. */
export const STORY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MIMES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);

export type StoryFetch = typeof fetch;
export type StorageEnv = { readonly supabaseUrl: string; readonly supabaseServiceRoleKey: string };
export type StoryPhoto = { readonly bytes: Uint8Array; readonly mime: string };

const objectUrl = (env: StorageEnv, bucket: string, path: string) =>
  `${env.supabaseUrl}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

/** 원본 사진을 읽는다. 없거나 너무 크거나 사진이 아니면 null — 던지지 않는다(네트워크 오류는 던진다). */
export async function downloadStoryPhoto(
  fetchImpl: StoryFetch,
  env: StorageEnv,
  path: string,
  timeoutMs: number,
): Promise<StoryPhoto | null> {
  const response = await fetchImpl(objectUrl(env, STORY_PHOTO_BUCKET, path), {
    headers: serviceKeyHeaders(env.supabaseServiceRoleKey),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 400 || response.status === 404) return null;
  if (response.status !== 200) throw new Error(`story photo download ${response.status}`);
  const mime = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!PHOTO_MIMES.has(mime) || bytes.length === 0 || bytes.length > STORY_PHOTO_MAX_BYTES)
    return null;
  return { bytes, mime };
}

/** 저장소 파일을 지운다(없는 파일은 그냥 지나간다). 실패하면 false — 던지지 않는다. */
export async function removeStoryFiles(
  fetchImpl: StoryFetch,
  env: StorageEnv,
  bucket: string,
  paths: readonly string[],
  timeoutMs: number,
): Promise<boolean> {
  if (paths.length === 0) return true;
  try {
    const response = await fetchImpl(`${env.supabaseUrl}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: {
        ...serviceKeyHeaders(env.supabaseServiceRoleKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: paths }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * 거절한 사진을 격리 버킷의 같은 경로로 옮긴다 — 이미 읽은 바이트를 올리고 원본을 지운다. 격리 경로, 올리지 못했으면 null
 * (그때는 원본도 지우지 않는다 — 다음에 같은 요청이 오면 다시 옮긴다).
 */
export async function quarantineStoryPhoto(
  fetchImpl: StoryFetch,
  env: StorageEnv,
  path: string,
  photo: StoryPhoto,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const uploaded = await fetchImpl(objectUrl(env, STORY_QUARANTINE_BUCKET, path), {
      method: "POST",
      headers: {
        ...serviceKeyHeaders(env.supabaseServiceRoleKey),
        "Content-Type": photo.mime,
        "x-upsert": "true",
      },
      body: new Blob([photo.bytes as Uint8Array<ArrayBuffer>], { type: photo.mime }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (uploaded.status !== 200) return null;
  } catch {
    return null;
  }
  await removeStoryFiles(fetchImpl, env, STORY_PHOTO_BUCKET, [path], timeoutMs);
  return path;
}

/** 한 유저의 폴더 `<user_id>/`를 1000개씩 나열해 지운다(계정 삭제). 지운 수. 실패하면 던진다. */
export async function purgeUserStoryFiles(
  fetchImpl: StoryFetch,
  env: StorageEnv,
  bucket: string,
  userId: string,
  timeoutMs: number,
): Promise<number> {
  const headers = {
    ...serviceKeyHeaders(env.supabaseServiceRoleKey),
    "Content-Type": "application/json",
  };
  let removed = 0;
  for (let round = 0; round < 20; round += 1) {
    const list = await fetchImpl(`${env.supabaseUrl}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix: `${userId}/`, limit: 1000, offset: 0 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 버킷이 아직 없으면(마이그레이션 전) 지울 것도 없다.
    if (list.status === 400 || list.status === 404) return removed;
    if (list.status !== 200) throw new Error(`list ${list.status}`);
    const names = ((await list.json()) as { name?: unknown }[])
      .map((item) => item.name)
      .filter((name): name is string => typeof name === "string" && name !== "");
    if (names.length === 0) return removed;
    const paths = names.map((name) => `${userId}/${name}`);
    if (!(await removeStoryFiles(fetchImpl, env, bucket, paths, timeoutMs)))
      throw new Error("remove failed");
    removed += names.length;
  }
  return removed;
}
