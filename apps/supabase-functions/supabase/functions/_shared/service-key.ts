// Supabase의 서버 키를 요청 헤더로 싣습니다. 키가 두 형식이라 헤더가 갈립니다.
//
// - 레거시 `service_role` 키는 JWT라 `apikey`와 `Authorization: Bearer`에 함께 싣습니다.
// - 새 비밀 키(`sb_secret_…`)는 JWT가 아니라 `apikey`에만 싣습니다 — 게이트웨이가 역할을 풀어 줍니다.
//   `Authorization`에 넣으면 JWT로 읽혀 거절됩니다.
//
// Edge 런타임의 `SUPABASE_SERVICE_ROLE_KEY`가 어느 형식인지는 프로젝트 설정에 따라 다르므로 코드가 가립니다.

const jwtShape = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function isJwtShaped(key: string): boolean {
  return jwtShape.test(key);
}

export function serviceKeyHeaders(key: string): Record<string, string> {
  return isJwtShaped(key) ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}
