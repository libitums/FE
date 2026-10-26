// 시험 계정(셀럽 체험 등)의 접근 표시입니다 — 켜진 계정은 티켓을 쓰지 않고 모든 유닛 · 롤플레이가 열립니다(ADR-0085).
//
// 표시는 Supabase 계정의 `app_metadata.duru_tester`(참)입니다. `app_metadata`는 사용자가 바꿀 수 없고 대시보드 ·
// 서버 키로만 고칩니다. 액세스 토큰(JWT)에 실려 오므로 앱은 토큰을 읽기만 합니다 — **서명을 검증하지 않습니다.**
// 티켓 · 잠금은 원래 기기에서 판정하므로(ADR-0075) 이 표시를 믿어도 지금보다 약해지는 곳이 없습니다.
//
// 판정하는 함수(티켓 비용 · 유닛 상태 · 롤플레이 열림)가 여러 화면에 흩어져 있어 인자로 꿰지 않고 이 모듈의 현재
// 값을 읽습니다. 값은 세션 훅(`use-tester-access.ts`)이 렌더마다 맞춥니다. 테스트는 끝에 `false`로 되돌립니다.

import { payloadRecordFrom } from "./auth-user-id";

export const TESTER_ACCESS_METADATA_KEY = "duru_tester";

/** 토큰의 `app_metadata.duru_tester`가 정확히 `true`인가입니다. 없거나 못 읽으면 거짓. 던지지 않습니다. */
export function testerAccessFrom(accessToken: string | null): boolean {
  if (accessToken === null) return false;
  const payload = payloadRecordFrom(accessToken);
  const metadata = payload === null ? null : payload["app_metadata"];
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>)[TESTER_ACCESS_METADATA_KEY] === true;
}

let active = false;

/** 지금 세션이 시험 계정인가입니다. */
export function isTesterAccessActive(): boolean {
  return active;
}

export function setTesterAccessActive(value: boolean): void {
  active = value;
}
