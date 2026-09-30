// 분석의 「누구인가」 두 동작(식별 · 되돌리기)의 어휘입니다. `analytics.contract.ts`가 300줄에 닿아
// 따로 둡니다. 둘은 같은 클라이언트에 대한 동작이라 **함께 있거나 함께 없습니다** — 클라이언트가
// 없으면 `AnalyticsUser` 자리가 통째로 `null`입니다(ADR-0029 D2의 sink 규약과 같습니다).
//
// 타입만 있습니다. 구현은 `posthog-client.ts`의 `createAnalyticsSession`이 가집니다.

/**
 * 되돌리는 범위입니다.
 *
 * - `identity` — 로그아웃. 새 익명 ID로 바꾸고 등록 속성(`environment`)을 다시 겁니다. 보내지 못한
 *   대기열은 남깁니다 — 그 이벤트들은 이미 로그아웃한 사용자의 ID를 싣고 있어 보내도 됩니다.
 * - `identity-and-queue` — 계정 삭제. 위에 더해 **대기열을 버립니다**(메모리 · 저장소
 *   `analytics.queue` 둘 다). 삭제된 사용자 ID로 이벤트가 나가지 않게 합니다.
 */
export type AnalyticsResetScope = "identity" | "identity-and-queue";

/** 던지지 않습니다 — SDK의 예외를 안에서 삼킵니다(ADR-0029 D11). */
export type AnalyticsReset = (scope: AnalyticsResetScope) => void;

/**
 * 진입점이 만들어 App에 내리는 묶음입니다. `identify`의 모양은 `AnalyticsIdentify`와 같습니다
 * (구조적으로 같은 함수 타입 — 이 파일은 `analytics.contract.ts`를 import하지 않습니다. 그쪽이 이
 * 파일을 import하므로 순환을 만들지 않기 위해서입니다).
 */
export type AnalyticsUser = {
  readonly identify: (userId: string) => void;
  readonly reset: AnalyticsReset;
};
