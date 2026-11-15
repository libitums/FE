// 계정 삭제가 부르는 컴패니언 결과 파일 지우기. Storage만 쓴다 — `delete-account`가 Claude SDK(`companion-media-engines.ts`)를
// 번들에 끌어오지 않게 따로 둔다(delete-account에는 import map이 없다).

import { serviceKeyHeaders } from "./service-key.ts";

export const MEDIA_BUCKET = "companion-media";

export type Fetch = typeof fetch;

/**
 * 한 유저의 결과 파일을 모두 지운다(계정 삭제). 폴더 `<user_id>/`를 1000개씩 나열해 지운다. 지운 수.
 * 실패하면 던진다 — 부르는 쪽이 계정 삭제를 막을지 정한다.
 */
export async function purgeUserMedia(
  fetchImpl: Fetch,
  env: { readonly supabaseUrl: string; readonly supabaseServiceRoleKey: string },
  userId: string,
  timeoutMs: number,
): Promise<number> {
  const headers = {
    ...serviceKeyHeaders(env.supabaseServiceRoleKey),
    "Content-Type": "application/json",
  };
  let removed = 0;
  for (let round = 0; round < 20; round += 1) {
    const list = await fetchImpl(`${env.supabaseUrl}/storage/v1/object/list/${MEDIA_BUCKET}`, {
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
    const remove = await fetchImpl(`${env.supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ prefixes: names.map((name) => `${userId}/${name}`) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (remove.status !== 200) throw new Error(`remove ${remove.status}`);
    removed += names.length;
  }
  return removed;
}
