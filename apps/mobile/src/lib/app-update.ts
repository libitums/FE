// 스토어 열기 접점입니다. 호스트 `AppUpdateModule`을 감쌉니다(ADR-0017 D3 — 모듈마다 파일 하나).
// 화면 · 결선은 `NativeModules`를 직접 만지지 않습니다.

import type { AppUpdateModule, AppUpdateStoreOutcome } from "./app-update.contract";

const hostStatuses = ["opened", "failed", "unconfigured"] as const;

/** 호스트 페이로드(`unknown`)를 결과로 좁힙니다. 던지지 않습니다. */
export function appUpdateStoreOutcomeFrom(payload: unknown): AppUpdateStoreOutcome {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return "malformed";
  }
  const status = (payload as Record<string, unknown>)["status"];
  if (typeof status !== "string" || !(hostStatuses as readonly string[]).includes(status)) {
    return "malformed";
  }
  return status as AppUpdateStoreOutcome;
}

// `legal-document.ts`와 같은 형태입니다 — `typeof` 가드 + `null` 가드 + 모듈 값 `null` 정규화.
function nativeModule(): AppUpdateModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["AppUpdateModule"] as
    | AppUpdateModule
    | undefined;
  return module ?? undefined;
}

/** 모듈이 없거나 `openStore`가 함수가 아니거나 던지면 `unavailable`. 콜백이 오면 그 결과로 resolve. 거부하지 않습니다. */
export function openAppStore(): Promise<AppUpdateStoreOutcome> {
  const host = nativeModule();
  if (host === undefined || typeof host.openStore !== "function") {
    return Promise.resolve("unavailable");
  }
  return new Promise((resolve) => {
    try {
      host.openStore((payload) => resolve(appUpdateStoreOutcomeFrom(payload)));
    } catch {
      resolve("unavailable");
    }
  });
}
