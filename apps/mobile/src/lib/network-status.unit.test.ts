import { afterEach, describe, expect, test, vi } from "vitest";

import { networkPropertiesFrom, readNetworkProperties, unknownNetwork } from "./network-status";

// `unit` 계층: 호스트 문자열 해석과 모듈 조회입니다(ADR-0096 D1 · D2). 어떤 입력에도 던지지 않고,
// 모르면 `unknown` 둘입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("networkPropertiesFrom", () => {
  test.each([
    ["wifi:unmetered", "wifi", "unmetered"],
    ["wifi:metered", "wifi", "metered"],
    ["cellular:metered", "cellular", "metered"],
    ["cellular:constrained", "cellular", "constrained"],
    ["ethernet:unmetered", "ethernet", "unmetered"],
    ["other:metered", "other", "metered"],
    ["offline:unknown", "offline", "unknown"],
  ])("NS1. %s → network=%s · networkCost=%s", (raw, network, networkCost) => {
    expect(networkPropertiesFrom(raw)).toEqual({ network, networkCost });
  });

  test("NS2. transport만 알면 그것만 살리고 cost는 unknown이다", () => {
    expect(networkPropertiesFrom("wifi:free")).toEqual({ network: "wifi", networkCost: "unknown" });
  });

  test("NS2. cost만 알면 그것만 살리고 network는 unknown이다", () => {
    expect(networkPropertiesFrom("satellite:metered")).toEqual({
      network: "unknown",
      networkCost: "metered",
    });
  });

  test.each([
    ["빈 문자열", ""],
    ["콜론 없음", "wifi"],
    ["콜론 둘", "wifi:metered:x"],
    ["대문자", "WIFI:METERED"],
    ["앞뒤 공백", " wifi:metered "],
    ["unknown 조합", "unknown:unknown"],
    ["숫자", 1],
    ["null", null],
    ["undefined", undefined],
    ["객체", { network: "wifi" }],
  ])("NS3. %s는 unknown 둘이다", (_label, raw) => {
    expect(networkPropertiesFrom(raw)).toEqual(unknownNetwork);
  });

  test("NS3. 아주 긴 문자열도 unknown 둘이다", () => {
    expect(networkPropertiesFrom(`wifi:${"m".repeat(10_000)}`)).toEqual({
      network: "wifi",
      networkCost: "unknown",
    });
  });
});

describe("readNetworkProperties", () => {
  test("NS4. 모듈이 값을 주면 해석한 값이다", () => {
    vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "cellular:metered" } });
    expect(readNetworkProperties()).toEqual({ network: "cellular", networkCost: "metered" });
  });

  test.each([
    ["NativeModules 없음", undefined],
    ["NativeModules null", null],
    ["모듈 없음", {}],
    ["모듈 null(등록 전)", { NetworkStatusModule: null }],
    ["current 없음", { NetworkStatusModule: {} }],
    ["current가 함수 아님", { NetworkStatusModule: { current: "wifi:unmetered" } }],
    ["current가 null", { NetworkStatusModule: { current: () => null } }],
  ])("NS5. %s → unknown 둘", (_label, modules) => {
    vi.stubGlobal("NativeModules", modules);
    expect(readNetworkProperties()).toEqual(unknownNetwork);
  });

  test("NS6. current가 던져도 던지지 않고 unknown 둘이다", () => {
    vi.stubGlobal("NativeModules", {
      NetworkStatusModule: {
        current: () => {
          throw new Error("bridge");
        },
      },
    });
    expect(() => readNetworkProperties()).not.toThrow();
    expect(readNetworkProperties()).toEqual(unknownNetwork);
  });

  test("NS6. 모듈 조회(getter)가 던져도 unknown 둘이다", () => {
    const modules = {};
    Object.defineProperty(modules, "NetworkStatusModule", {
      get() {
        throw new Error("getter");
      },
    });
    vi.stubGlobal("NativeModules", modules);
    expect(readNetworkProperties()).toEqual(unknownNetwork);
  });

  test("NS7. 부를 때마다 다시 읽는다 — 값을 쌓아 두지 않는다", () => {
    let raw = "wifi:unmetered";
    vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => raw } });
    expect(readNetworkProperties().network).toBe("wifi");
    raw = "offline:unknown";
    expect(readNetworkProperties().network).toBe("offline");
  });
});
