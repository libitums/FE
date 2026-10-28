// 콘텐츠를 읽을 버킷입니다(ADR-0087 D3). 운영은 `content`, 테스트 빌드만 빌드 때 `PUBLIC_CONTENT_BUCKET`으로 바꿉니다.

const TEST_BUCKET = /^content-[a-z0-9-]+$/;

/**
 * `content-`로 시작하는 이름(`content-test` 등)만 돌려줍니다. 비었거나 규칙 밖이면 `undefined` — `contentBaseUrl`의
 * 기본값(운영 버킷 `content`)이 섭니다. 던지지 않습니다.
 */
export function contentBucketFrom(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return TEST_BUCKET.test(trimmed) ? trimmed : undefined;
}

/** 빌드가 주입한 값을 호출마다 리터럴 접근으로 읽습니다(번들 치환 — `supabase-config.ts`와 같은 근거). */
export function contentBucket(): string | undefined {
  return contentBucketFrom(import.meta.env.PUBLIC_CONTENT_BUCKET);
}
