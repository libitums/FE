// 강제 업데이트 화면(진입 `update-required`)의 props · 상태 · 식별자입니다(ADR-0086). 구현 · JSX는 두지 않습니다.
// 나가는 수단이 없습니다 — 스토어에서 업데이트한 뒤 다시 켜는 것이 유일한 길입니다. Android 시스템 뒤로가기는
// 진입 구간 기본값(`leave` — 호스트가 앱을 뒤로 물러나게 함)을 탑니다.

import type { AppUpdateStoreOutcome } from "../../lib/app-update.contract";

export type UpdateRequiredScreenProps = {
  /** `Update` 버튼 — 호스트가 스토어 페이지를 엽니다. 거부하지 않습니다. */
  readonly onUpdate: () => Promise<AppUpdateStoreOutcome>;
};

/**
 * - `idle` — 버튼을 누를 수 있다. `failure`가 있으면 버튼 위에 실패 문구가 선다(`null`이면 없음).
 * - `opening` — 호스트 응답을 기다린다. 버튼은 로딩.
 */
export type UpdateRequiredState =
  | { readonly kind: "idle"; readonly failure: "store" | null }
  | { readonly kind: "opening" };

export type UpdateRequiredTestId =
  | "update-required-screen"
  | "update-required-screen-body"
  | "update-required-screen-title"
  | "update-required-screen-description"
  | "update-required-screen-update"
  | "update-required-screen-failure";
