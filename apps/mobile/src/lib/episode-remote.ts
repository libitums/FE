import "background-only";

// 원격 콘텐츠(Supabase Storage 공개 버킷 `content`)의 URL과 전송입니다.
// 주소 규약(버킷 경로 · 기준 주소 · 안전한 상대 경로)은 `@libitums/episode-core/content-url`이 정본입니다.
import { contentBaseUrl, resolveContentUrlSafe } from "@libitums/episode-core/content-url";

import { sendGet } from "./supabase-transport";

export {
  CONTENT_BUCKET_PATH,
  contentBaseUrl,
  counterpartAvatarPathOf,
  resolveContentUrlSafe,
  type CounterpartAvatarDecode,
} from "@libitums/episode-core/content-url";

export type FetchTextResult =
  | { ok: true; status: number; text: string }
  | { ok: false; reason: "network" | "unconfigured" };

/** 콘텐츠 JSON 요청의 기기 캐시 키입니다. version = 그 본문의 sha256(내용 주소), fresh = 지금 분(목록 파일). */
export type ContentRequestKey =
  | { readonly kind: "version"; readonly sha256: string }
  | { readonly kind: "fresh" };

/** 인자는 기준 상대 경로입니다. key가 있으면 주소 뒤에 기기 캐시 키 쿼리를 붙입니다. */
export type FetchText = (relative: string, key?: ContentRequestKey) => Promise<FetchTextResult>;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const VERSION_LENGTH = 16;
const MINUTE_MS = 60_000;

/**
 * 쿼리 문자열 — version: "?v=" + sha256 앞 16자(sha가 [0-9a-f]{64}가 아니면 ""), fresh: "?m=" + 분 단위
 * (nowMs가 유한한 0 이상이 아니면 ""), key 없음: "". 순수 · 던지지 않음.
 */
export function contentRequestQuery(key: ContentRequestKey | undefined, nowMs: number): string {
  if (key === undefined) {
    return "";
  }
  if (key.kind === "version") {
    return SHA256_PATTERN.test(key.sha256) ? `?v=${key.sha256.slice(0, VERSION_LENGTH)}` : "";
  }
  return Number.isFinite(nowMs) && nowMs >= 0 ? `?m=${Math.floor(nowMs / MINUTE_MS)}` : "";
}

/** 상대 경로가 이미 쿼리나 조각을 품으면 키를 붙이지 않습니다. */
function queryFor(relative: string, key: ContentRequestKey | undefined, nowMs: number): string {
  return relative.includes("?") || relative.includes("#") ? "" : contentRequestQuery(key, nowMs);
}

/** now를 주입한 콘텐츠 전송입니다. 경로 검사는 쿼리 전 경로에 돌고, 헤더는 apikey뿐입니다. */
export function createContentFetchText(now: () => number): FetchText {
  return async (relative, key) => {
    // 기준 주소는 설정이 있어야 알 수 있어, 경로 거부는 기준 없이 먼저 판정합니다.
    if (resolveContentUrlSafe("", relative) === null) {
      return { ok: false, reason: "network" };
    }
    const query = queryFor(relative, key, now());
    const outcome = await sendGet(
      (config) => `${resolveContentUrlSafe(contentBaseUrl(config.url), relative) ?? ""}${query}`,
      (config) => ({ apikey: config.anonKey }),
    );
    return outcome.ok
      ? { ok: true, status: outcome.status, text: outcome.bodyText }
      : { ok: false, reason: outcome.reason };
  };
}

export const fetchContentText: FetchText = createContentFetchText(Date.now);
