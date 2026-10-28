// 원격 콘텐츠(Supabase Storage 공개 버킷 `content`)의 주소 규약입니다(순수). 전송은 소비자가 맡습니다.

export const CONTENT_BUCKET_PATH = "/storage/v1/object/public/content/";

/** 운영 버킷 이름입니다. 테스트 빌드만 다른 버킷(`content-test`)을 읽습니다(ADR-0087 D3). */
export const CONTENT_BUCKET = "content";

export function contentBaseUrl(supabaseUrl: string, bucket: string = CONTENT_BUCKET): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/`;
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
