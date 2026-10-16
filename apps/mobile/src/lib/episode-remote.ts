import "background-only";

// 원격 콘텐츠(Supabase Storage 공개 버킷 `content`)의 URL과 전송입니다.
import { sendGet } from "./supabase-transport";

export const CONTENT_BUCKET_PATH = "/storage/v1/object/public/content/";

export function contentBaseUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}${CONTENT_BUCKET_PATH}`;
}

// 콘텐츠가 버킷 이름까지 적은 경로(`content/images/…`)입니다. 기준이 이미 버킷이라 한 번 떼어 같은 파일을 가리킵니다.
const BUCKET_SEGMENT = "content/";

/**
 * 기준 상대 경로만 받습니다. 선두 `content/` 조각은 한 번 뗍니다. 빈 값 · 선두 "/" · ".." 조각 · 스킴이
 * 있으면 `null`.
 */
export function resolveContentUrlSafe(base: string, path: string): string | null {
  const relative = path.startsWith(BUCKET_SEGMENT) ? path.slice(BUCKET_SEGMENT.length) : path;
  if (relative.length === 0 || relative.startsWith("/") || relative.includes("://")) {
    return null;
  }
  if (relative.split("/").includes("..")) {
    return null;
  }
  return `${base}${relative}`;
}

export type FetchTextResult =
  | { ok: true; status: number; text: string }
  | { ok: false; reason: "network" | "unconfigured" };
/** 인자는 기준 상대 경로입니다. */
export type FetchText = (relative: string) => Promise<FetchTextResult>;

export const fetchContentText: FetchText = async (relative) => {
  // 기준 주소는 설정이 있어야 알 수 있어, 경로 거부는 기준 없이 먼저 판정합니다.
  if (resolveContentUrlSafe("", relative) === null) {
    return { ok: false, reason: "network" };
  }
  const outcome = await sendGet(
    (config) => resolveContentUrlSafe(contentBaseUrl(config.url), relative) ?? "",
    (config) => ({ apikey: config.anonKey }),
  );
  return outcome.ok
    ? { ok: true, status: outcome.status, text: outcome.bodyText }
    : { ok: false, reason: outcome.reason };
};
