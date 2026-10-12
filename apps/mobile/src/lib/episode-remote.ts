import "background-only";

// 원격 콘텐츠(Supabase Storage 공개 버킷 `content`)의 URL과 전송입니다.
import { sendGet } from "./supabase-transport";

export const CONTENT_BUCKET_PATH = "/storage/v1/object/public/content/";

export function contentBaseUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}${CONTENT_BUCKET_PATH}`;
}

/** 기준 상대 경로만 받습니다. 빈 값 · 선두 "/" · ".." 조각 · 스킴이 있으면 `null`. */
export function resolveContentUrlSafe(base: string, relative: string): string | null {
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
