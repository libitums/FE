// 이벤트가 날 때의 연결 종류를 호스트(`NetworkStatusModule.current()`)에서 읽어 분석 속성 둘로 바꿉니다
// (ADR-0096). 순수 해석 + 모듈 조회뿐이고 던지지 않습니다 — 모르면 `unknown`입니다.

export type NetworkTransport = "wifi" | "cellular" | "ethernet" | "other" | "offline" | "unknown";
export type NetworkCost = "unmetered" | "metered" | "constrained" | "unknown";

export type NetworkProperties = {
  readonly network: NetworkTransport;
  readonly networkCost: NetworkCost;
};

export const unknownNetwork: NetworkProperties = { network: "unknown", networkCost: "unknown" };

const knownTransports: readonly NetworkTransport[] = [
  "wifi",
  "cellular",
  "ethernet",
  "other",
  "offline",
];
const knownCosts: readonly NetworkCost[] = ["unmetered", "metered", "constrained"];

/** 호스트 문자열 `"<transport>:<cost>"`를 해석합니다. 모르는 값 · 형식 오류는 `unknownNetwork`입니다. */
export function networkPropertiesFrom(raw: unknown): NetworkProperties {
  if (typeof raw !== "string") return unknownNetwork;
  const parts = raw.split(":");
  if (parts.length !== 2) return unknownNetwork;
  const [transport, cost] = parts;
  return {
    network: knownTransports.find((known) => known === transport) ?? "unknown",
    networkCost: knownCosts.find((known) => known === cost) ?? "unknown",
  };
}

/** 지금 연결 종류입니다. 모듈이 없거나 실패하면 `unknownNetwork`입니다. */
export function readNetworkProperties(): NetworkProperties {
  try {
    // `NativeModules`가 없거나 `null`인 경우 · 등록 전 모듈이 `null`인 경우는 `storage.ts`의 가드와 같은 이유입니다.
    if (typeof NativeModules === "undefined" || NativeModules === null) return unknownNetwork;
    const module = (NativeModules as Record<string, unknown>)["NetworkStatusModule"] as
      | { current?: unknown }
      | null
      | undefined;
    const current = module?.current;
    if (typeof current !== "function") return unknownNetwork;
    return networkPropertiesFrom((current as () => unknown).call(module));
  } catch {
    return unknownNetwork;
  }
}
