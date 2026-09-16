// 임시 로그인 토큰 저장소 경계 (LIB-261 계약 §2.3). 저장소 키를 정하는 유일한
// 자리다(ADR-0007 D1 · ADR-0012 D2). `lib/storage.ts`의 `setItem`·`getItem`만
// 부른다 — `storage.ts`를 고치지 않는다.
//
// LIB-261 (logic): 타입·시그니처는 계약 §2.3 최종본이다. 값·함수 본문도 이 단계가
// `storage.ts` 결선과 계약 §0.3 D-d의 값으로 채운다.

import { getItem, setItem } from "./storage";

export type AuthToken = string;

// 저장소에 들어가는 유일한 키다(§0.3 D-d).
export const authTokenStorageKey = "libitum.auth.token";

// 고정 리터럴 하나 — 호출마다 같은 값이고 시각·수단·전화번호를 싣지 않는다(§0.3 D-d).
export function createTemporaryAuthToken(): AuthToken {
  return "temporary-entry-token";
}

// `storage.ts`가 저장소 부재를 이미 정규화한다(no-op) — 여기서 다시 가드하지 않는다.
export function saveAuthToken(token: AuthToken): void {
  setItem(authTokenStorageKey, token);
}

// `storage.ts`가 저장소 부재를 이미 `null`로 정규화한다 — 없으면 거짓이다.
export function hasAuthToken(): boolean {
  return getItem(authTokenStorageKey) !== null;
}
