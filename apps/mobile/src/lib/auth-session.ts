// 세션 한 항목의 직렬화 · 저장 · 스플래시 갈래 판정입니다. `lib/storage.ts`의 `getItem` ·
// `setItem` · `removeItem`만 부릅니다 — `storage.ts`를 고치지 않습니다.

import type {
  AuthSession,
  EntryAuthState,
  SessionRefreshDisposition,
  SessionRefreshFailure,
} from "./auth-session.contract";
import { getItem, removeItem, setItem } from "./storage";

/** 저장소에 들어가는 유일한 키입니다. */
export const authSessionStorageKey = "libitum.auth.session";

/** 세 값만 담은 JSON입니다. */
export function serializeAuthSession(session: AuthSession): string {
  return JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  });
}

/**
 * `null` · JSON 실패 · 필드 누락 · 빈 문자열 · `expiresAt`이 유한수 아님 → `null`입니다.
 * `serializeAuthSession`의 왕복이 항등입니다.
 */
export function parseAuthSession(raw: string | null): AuthSession | null {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const accessToken = record["accessToken"];
  const refreshToken = record["refreshToken"];
  const expiresAt = record["expiresAt"];
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return null;
  }
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    return null;
  }
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return null;
  }
  return { accessToken, refreshToken, expiresAt };
}

/** 계약 `EntryAuthState`의 판정입니다 — 세션이 있으면 `refresh`, 없으면 `none`. */
export function entryAuthStateFrom(session: AuthSession | null): EntryAuthState {
  if (session !== null) {
    return { kind: "refresh", refreshToken: session.refreshToken };
  }
  return { kind: "none" };
}

/** `rejected` → `clear`, 나머지 → `keep`. */
export function sessionRefreshDisposition(
  reason: SessionRefreshFailure,
): SessionRefreshDisposition {
  switch (reason) {
    case "rejected": {
      return "clear";
    }
    case "network":
    case "unavailable":
    case "unconfigured": {
      return "keep";
    }
  }
}

/** `setItem(authSessionStorageKey, serializeAuthSession(session))`. */
export function saveAuthSession(session: AuthSession): void {
  setItem(authSessionStorageKey, serializeAuthSession(session));
}

/** `parseAuthSession(getItem(authSessionStorageKey))`. */
export function loadAuthSession(): AuthSession | null {
  return parseAuthSession(getItem(authSessionStorageKey));
}

/** `removeItem(authSessionStorageKey)`. */
export function clearAuthSession(): void {
  removeItem(authSessionStorageKey);
}
