// 호스트가 받아 둔 Airbridge 딥링크를 꺼냅니다(ADR-0080). `AirbridgeEventsModule.takeOpenedDeeplink`는 SDK가 시작된
// 빌드에만 있습니다 — 없으면 `null`이고 아무 일도 없습니다. 던지지 않습니다.

import type { AirbridgeEventsModule, AirbridgeEventsModuleName } from "./airbridge-events.contract";

const moduleName: AirbridgeEventsModuleName = "AirbridgeEventsModule";

export function takeOpenedDeeplink(): Promise<string | null> {
  if (typeof NativeModules === "undefined" || NativeModules === null) return Promise.resolve(null);
  const host = (NativeModules as Record<string, unknown>)[moduleName] as
    | Partial<AirbridgeEventsModule>
    | undefined;
  if (typeof host?.takeOpenedDeeplink !== "function") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      host.takeOpenedDeeplink?.((payload) => {
        const url =
          typeof payload === "object" && payload !== null
            ? (payload as { url?: unknown }).url
            : null;
        resolve(typeof url === "string" ? url : null);
      });
    } catch {
      resolve(null);
    }
  });
}
