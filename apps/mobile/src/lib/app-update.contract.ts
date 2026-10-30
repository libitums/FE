// 스토어 페이지를 여는 호스트 접점 어휘입니다(ADR-0086). 호스트 `AppUpdateModule`이 iOS App Store ·
// Google Play의 이 앱 페이지를 엽니다 — **주소는 호스트가 듭니다.** JS는 아무것도 넘기지 않습니다
// (ADR-0026 D4 · ADR-0033의 경계 그대로). 타입만 있습니다. 호출은 `app-update.ts`가 가집니다.

/**
 * 호스트가 `AppUpdateModule`이라는 이름으로 등록합니다. 메서드는 하나입니다.
 *
 * - `openStore` — 스토어 페이지를 띄우고 **정확히 한 번** 콜백합니다.
 */
export interface AppUpdateModule {
  openStore(callback: (payload: unknown) => void): void;
}

/**
 * 스토어 열기의 결과입니다. `unavailable` · `malformed`만 JS 쪽에서 생깁니다 — 모듈이 없거나 호출이 던졌을 때,
 * 브리지를 건너온 값이 아는 모양이 아닐 때. `unconfigured`는 호스트에 스토어 주소가 아직 없을 때(iOS Apple ID 미정).
 */
export type AppUpdateStoreOutcome =
  | "opened"
  | "failed"
  | "unconfigured"
  | "unavailable"
  | "malformed";
