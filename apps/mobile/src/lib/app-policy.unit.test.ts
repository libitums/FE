import { describe, expect, test } from "vitest";

import { APP_POLICY_KEY, appUpdateDecision, decodeAppPolicy, loadAppPolicy } from "./app-policy";
import type { AppVersion } from "./app-version";
import { fakeStore } from "./episode-refresh.test-support";

// `unit` 계층: 정책 디코드 · 판정 · 저장소 읽기(ADR-0086). 전부 순수이고 던지지 않습니다.

const policyText = (minBuild: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ schema: "app-policy-1", min_build: minBuild, ...extra });

const android6: AppVersion = { platform: "android", name: "0.1.0", build: 6 };
const ios11: AppVersion = { platform: "ios", name: "1.0", build: 11 };

describe("decodeAppPolicy", () => {
  test("AP1. 스키마 · 정수 최소 빌드를 읽고, 모르는 키 · 모르는 플랫폼은 버린다", () => {
    expect(decodeAppPolicy(policyText({ ios: 11, android: 6 }))).toEqual({
      minBuild: { ios: 11, android: 6 },
    });
    expect(decodeAppPolicy(policyText({ android: 6, web: 3 }, { note: "x" }))).toEqual({
      minBuild: { android: 6 },
    });
    expect(decodeAppPolicy(policyText({}))).toEqual({ minBuild: {} });
  });

  test.each<[label: string, text: string]>([
    ["JSON이 아님", "{not json"],
    ["배열", "[]"],
    ["스키마가 다름", JSON.stringify({ schema: "app-policy-2", min_build: {} })],
    ["min_build 없음", JSON.stringify({ schema: "app-policy-1" })],
    ["min_build가 배열", JSON.stringify({ schema: "app-policy-1", min_build: [] })],
    ["값이 소수", policyText({ ios: 1.5 })],
    ["값이 문자열", policyText({ android: "6" })],
    ["값이 음수", policyText({ android: -1 })],
  ])("AP2. 틀린 원문(%s)은 null이다", (_label, text) => {
    expect(decodeAppPolicy(text)).toBeNull();
  });
});

describe("appUpdateDecision", () => {
  test("AP3. 플랫폼의 최소 빌드보다 낮을 때만 required다", () => {
    const policy = { minBuild: { android: 7 } };
    expect(appUpdateDecision(android6, policy)).toBe("required");
    expect(appUpdateDecision({ ...android6, build: 7 }, policy)).toBe("none");
    expect(appUpdateDecision({ ...android6, build: 8 }, policy)).toBe("none");
  });

  test("AP4. 버전 · 정책 · 플랫폼 키 중 하나라도 없으면 none이다", () => {
    expect(appUpdateDecision(null, { minBuild: { android: 7 } })).toBe("none");
    expect(appUpdateDecision(android6, null)).toBe("none");
    expect(appUpdateDecision(ios11, { minBuild: { android: 99 } })).toBe("none");
    expect(appUpdateDecision(ios11, { minBuild: {} })).toBe("none");
  });
});

describe("loadAppPolicy", () => {
  test("AP5. 저장소의 원문을 디코드한다", () => {
    const { store } = fakeStore({ [APP_POLICY_KEY]: policyText({ ios: 11 }) });
    expect(loadAppPolicy(store)).toEqual({ minBuild: { ios: 11 } });
  });

  test("AP6. 없거나 틀리면 null이다", () => {
    expect(loadAppPolicy(fakeStore().store)).toBeNull();
    expect(loadAppPolicy(fakeStore({ [APP_POLICY_KEY]: "{bad" }).store)).toBeNull();
  });

  test("AP7. 저장소 읽기가 던져도 null이고 던지지 않는다", () => {
    const { store } = fakeStore();
    store.get = () => {
      throw new Error("storage");
    };
    expect(() => loadAppPolicy(store)).not.toThrow();
    expect(loadAppPolicy(store)).toBeNull();
  });
});
