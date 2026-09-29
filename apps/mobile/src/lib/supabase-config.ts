// Supabase 접속 값을 읽고 판정하는 유일한 자리입니다. `import.meta.env.PUBLIC_SUPABASE_URL` ·
// `…_ANON_KEY`를 호출마다 리터럴 접근으로 읽습니다.

import type { SupabaseConfig } from "./auth-session.contract";

/**
 * 순수 판정 함수입니다. `url` · `anonKey`가 문자열이고 형식 규칙을 지키면
 * `SupabaseConfig`, 아니면 `null`을 돌려줍니다.
 */
export function supabaseConfigFrom(url: unknown, anonKey: unknown): SupabaseConfig | null {
  if (typeof url !== "string" || typeof anonKey !== "string") {
    return null;
  }
  const trimmedUrl = url.trim();
  const trimmedAnonKey = anonKey.trim();
  if (trimmedUrl.length === 0 || trimmedAnonKey.length === 0) {
    return null;
  }
  // `https://` 뒤에 호스트가 있어야 합니다 — `https://`나 `https:///`만이면 요청 주소가 서지 않습니다.
  if (!/^https:\/\/[^/\s]+/.test(trimmedUrl)) {
    return null;
  }
  if (trimmedAnonKey.startsWith("sb_secret_")) {
    return null;
  }
  return { url: trimmedUrl.replace(/\/+$/, ""), anonKey: trimmedAnonKey };
}

/**
 * 빌드가 주입한 환경 변수를 호출마다 읽어 `supabaseConfigFrom`에 넘깁니다. 리터럴
 * 멤버 접근을 유지합니다 — 구조 분해·동적 키로 읽으면 번들 치환이 안 됩니다.
 */
export function supabaseConfig(): SupabaseConfig | null {
  return supabaseConfigFrom(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
}
