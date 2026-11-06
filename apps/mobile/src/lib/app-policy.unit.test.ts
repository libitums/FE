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

describe("decodeAppPolicy — unavailable_login_methods (개정 3)", () => {
  const withUnavailable = (value: unknown) =>
    decodeAppPolicy(policyText({ android: 6 }, { unavailable_login_methods: value }));

  test("AP-U1. 칸이 없으면 unavailableLoginMethods 필드가 없다", () => {
    const policy = decodeAppPolicy(policyText({ android: 6 }));

    expect(policy).not.toBeNull();
    expect(policy?.unavailableLoginMethods).toBeUndefined();
  });

  test("AP-U2. 정상 값은 all · android 그대로 읽힌다", () => {
    expect(withUnavailable({ all: ["facebook"], android: ["apple"] })).toEqual({
      minBuild: { android: 6 },
      unavailableLoginMethods: { all: ["facebook"], android: ["apple"] },
    });
    expect(withUnavailable({ all: [], android: [] })?.unavailableLoginMethods).toEqual({
      all: [],
      android: [],
    });
    expect(withUnavailable({ all: ["google"] })?.unavailableLoginMethods).toEqual({
      all: ["google"],
      android: [],
    });
  });

  test.each<[label: string, value: unknown]>([
    ["문자열", "facebook"],
    ["배열", ["facebook"]],
    ["null", null],
    ["숫자", 3],
  ])("AP-U3. 값이 object가 아니면(%s) 필드가 없고 min_build 판정은 유지된다", (_label, value) => {
    const policy = withUnavailable(value);

    expect(policy).not.toBeNull();
    expect(policy?.unavailableLoginMethods).toBeUndefined();
    expect(policy?.minBuild).toEqual({ android: 6 });
  });

  test("AP-U4. all · android가 배열이 아니면 그 키만 []이다", () => {
    expect(
      withUnavailable({ all: "facebook", android: ["apple"] })?.unavailableLoginMethods,
    ).toEqual({ all: [], android: ["apple"] });
    expect(withUnavailable({ all: ["facebook"], android: {} })?.unavailableLoginMethods).toEqual({
      all: ["facebook"],
      android: [],
    });
  });

  test("AP-U5. 모르는 이름 · 문자열 아닌 원소는 버리고, 중복을 없애고, 어휘 순서로 정렬한다", () => {
    const policy = withUnavailable({
      all: ["facebook", "twitter", 7, "phone", "facebook", null],
      android: ["google", "apple", "apple"],
    });

    expect(policy?.unavailableLoginMethods).toEqual({
      all: ["phone", "facebook"],
      android: ["apple", "google"],
    });
  });
});

test("AP-U6. hidden_login_methods 칸은 unavailable과 같은 규칙으로 읽힌다 — 없으면 필드 없음 · 모르는 이름 버림 · 칸만 무시", () => {
  const base = { schema: "app-policy-1", min_build: { android: 6 } };
  expect(decodeAppPolicy(JSON.stringify(base))?.hiddenLoginMethods).toBeUndefined();
  expect(
    decodeAppPolicy(
      JSON.stringify({
        ...base,
        hidden_login_methods: { all: ["facebook", "nope"], android: ["apple"] },
      }),
    ),
  ).toEqual({
    minBuild: { android: 6 },
    hiddenLoginMethods: { all: ["facebook"], android: ["apple"] },
  });
  const broken = decodeAppPolicy(JSON.stringify({ ...base, hidden_login_methods: "facebook" }));
  expect(broken?.hiddenLoginMethods).toBeUndefined();
  expect(broken?.minBuild).toEqual({ android: 6 });
  expect(
    decodeAppPolicy(
      JSON.stringify({
        ...base,
        unavailable_login_methods: { all: ["google"] },
        hidden_login_methods: { all: [] },
      }),
    ),
  ).toEqual({
    minBuild: { android: 6 },
    unavailableLoginMethods: { all: ["google"], android: [] },
    hiddenLoginMethods: { all: [], android: [] },
  });
});
