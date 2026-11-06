// 비회원 표식 · 계정 상태입니다(docs/specs/entry-flow.md · ADR-0111). `lib/storage.ts`의 `getItem` ·
// `setItem` · `removeItem`만 부릅니다(`auth-session.ts`와 같은 꼴).

import type { AuthSession } from "./auth-session.contract";
import { getItem, removeItem, setItem } from "./storage";

/** 저장소 키 — ADR-0032 D6 키 표에 들어가는 행입니다. 값은 `"1"` 하나입니다. */
export const guestSessionStorageKey = "libitum.auth.guest";
export const guestSessionMarker = "1";

/** 정확히 `"1"`일 때만 참입니다. */
export function isGuestSessionMarker(raw: string | null): boolean {
  return raw === guestSessionMarker;
}

export function loadGuestSession(): boolean {
  return isGuestSessionMarker(getItem(guestSessionStorageKey));
}

export function saveGuestSession(): void {
  setItem(guestSessionStorageKey, guestSessionMarker);
}

export function clearGuestSession(): void {
  removeItem(guestSessionStorageKey);
}

/** 앱이 「누구로」 도는가 — 세션이 표식을 이깁니다. `signed-out`은 둘 다 없음(진입 구간)입니다. */
export type AccountState = "signed-out" | "guest" | "signed-in";

export function accountStateFrom(session: AuthSession | null, guest: boolean): AccountState {
  if (session !== null) {
    return "signed-in";
  }
  return guest ? "guest" : "signed-out";
}
