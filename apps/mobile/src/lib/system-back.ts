// Android 시스템 뒤로가기 호스트 접점입니다. 호스트 `SystemBackModule`을 감쌉니다(ADR-0017 D3).

import type {
  SystemBackModule,
  SystemBackOutcome,
  SystemBackRequestOutcome,
  SystemBackToken,
} from "./system-back.contract";

export const systemBackEventName = "systemBackPressed";

// `legal-document.ts`와 같은 형태입니다 — `typeof` 가드 + `null` 가드 + 모듈 값 `null` 정규화.
function nativeModule(): SystemBackModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["SystemBackModule"] as
    | SystemBackModule
    | undefined;
  return module ?? undefined;
}

/** 전역 이벤트의 첫 인자를 토큰으로 좁힙니다. 비어 있지 않은 문자열만 토큰이고 그 밖은 `null`. 던지지 않습니다. */
export function systemBackTokenFrom(payload: unknown): SystemBackToken | null {
  if (typeof payload !== "string" || payload === "") {
    return null;
  }
  return payload as SystemBackToken;
}

/** `SystemBackModule.ready()`. 모듈이 없거나 함수가 아니거나 던지면 `unavailable`. */
export function notifySystemBackReady(): SystemBackRequestOutcome {
  const host = nativeModule();
  if (host === undefined || typeof host.ready !== "function") {
    return "unavailable";
  }
  try {
    host.ready();
  } catch {
    return "unavailable";
  }
  return "requested";
}

/** `SystemBackModule.respond(token, outcome)`. 위와 같은 `unavailable` 규칙. */
export function answerSystemBack(
  token: SystemBackToken,
  outcome: SystemBackOutcome,
): SystemBackRequestOutcome {
  const host = nativeModule();
  if (host === undefined || typeof host.respond !== "function") {
    return "unavailable";
  }
  try {
    host.respond(token, outcome);
  } catch {
    return "unavailable";
  }
  return "requested";
}
