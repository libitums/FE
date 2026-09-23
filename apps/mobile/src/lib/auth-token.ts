// 임시 로그인 토큰 저장소 경계입니다. 저장소 키를 정하는 유일한 자리입니다
// (ADR-0007 D1 · ADR-0012 D2). `lib/storage.ts`의 `setItem`·`getItem`만 부르고,
// `storage.ts`를 고치지 않습니다.

import { getItem, setItem } from "./storage";

export type AuthToken = string;

// 저장소에 들어가는 유일한 키입니다.
export const authTokenStorageKey = "libitum.auth.token";

// 고정 리터럴 하나입니다 — 호출마다 같은 값이고 시각·수단·전화번호를 싣지 않습니다.
export function createTemporaryAuthToken(): AuthToken {
  return "temporary-entry-token";
}

// `storage.ts`가 저장소 부재를 이미 정규화합니다(no-op) — 여기서 다시 가드하지 않습니다.
export function saveAuthToken(token: AuthToken): void {
  setItem(authTokenStorageKey, token);
}

// `storage.ts`가 저장소 부재를 이미 `null`로 정규화합니다 — 없으면 거짓입니다.
export function hasAuthToken(): boolean {
  return getItem(authTokenStorageKey) !== null;
}
