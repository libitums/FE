// 호스트 추적 허용(ATT) 요청의 해석입니다(ADR-0079 D2). `AirbridgeEventsModule.requestTrackingAuthorization`은
// iOS에만 있고, 그것도 Airbridge 값이 있어 SDK가 시작된 빌드에서만 등록됩니다 — 없으면 묻지 않습니다.
// 「아직 정하지 않았을 때만 시스템 대화상자」는 호스트가 지고, 여기서는 부를지 말지만 가립니다.
// 백그라운드 전용 표시를 두지 않습니다 — 셸의 effect(백그라운드)에서만 불리고, 모듈을 import 시점에 읽지 않습니다.

import type { AirbridgeEventsModule, AirbridgeEventsModuleName } from "./airbridge-events.contract";

const moduleName: AirbridgeEventsModuleName = "AirbridgeEventsModule";

/** 불렀으면 `true`, 부를 곳이 없거나 호스트가 던졌으면 `false`입니다. 던지지 않습니다. */
export function requestTrackingAuthorization(): boolean {
  if (typeof NativeModules === "undefined" || NativeModules === null) return false;
  const host = (NativeModules as Record<string, unknown>)[moduleName] as
    | Partial<AirbridgeEventsModule>
    | undefined;
  if (typeof host?.requestTrackingAuthorization !== "function") return false;
  try {
    host.requestTrackingAuthorization();
    return true;
  } catch {
    return false;
  }
}
