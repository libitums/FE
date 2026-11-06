import { afterEach, expect, test, vi } from "vitest";

import {
  appVersionPropertiesFrom,
  readAppVersionProperties,
  unknownAppVersionProperties,
} from "./app-version-properties";

const android = { platform: "android", name: "1.2.0", build: 12 } as const;
const unknownTriple = { platform: "unknown", appVersion: "unknown", appBuild: "unknown" };

function stubLynx(globalProps: unknown): void {
  vi.stubGlobal("lynx", { __globalProps: globalProps });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// AV-U1
test("좁힌 버전을 platform · appVersion · appBuild 문자열 셋으로 바꾼다", () => {
  expect(appVersionPropertiesFrom({ platform: "ios", name: "1.0.0", build: 13 })).toStrictEqual({
    platform: "ios",
    appVersion: "1.0.0",
    appBuild: "13",
  });
  expect(appVersionPropertiesFrom(android)).toStrictEqual({
    platform: "android",
    appVersion: "1.2.0",
    appBuild: "12",
  });
});

// AV-U2
test("null이면 셋 모두 unknown이다", () => {
  expect(appVersionPropertiesFrom(null)).toBe(unknownAppVersionProperties);
  expect(unknownAppVersionProperties).toStrictEqual(unknownTriple);
});

// AV-U3
test("빌드 0과 큰 정수도 문자열 그대로다", () => {
  expect(appVersionPropertiesFrom({ platform: "ios", name: "1.0", build: 0 }).appBuild).toBe("0");
  expect(
    appVersionPropertiesFrom({ platform: "android", name: "1.0", build: 2147483647 }).appBuild,
  ).toBe("2147483647");
});

// AV-U4
test("background의 lynx.__globalProps.appVersion에서 읽는다", () => {
  stubLynx({ safeAreaInsets: {}, appVersion: android });

  expect(readAppVersionProperties()).toStrictEqual({
    platform: "android",
    appVersion: "1.2.0",
    appBuild: "12",
  });
});

// AV-U5
test.each<[string, () => void]>([
  ["lynx 없음", () => vi.stubGlobal("lynx", undefined)],
  ["__globalProps 없음", () => vi.stubGlobal("lynx", {})],
  ["__globalProps null", () => stubLynx(null)],
  ["__globalProps 문자열", () => stubLynx("1.0")],
  ["appVersion 키 없음", () => stubLynx({})],
  ["appVersion 문자열", () => stubLynx({ appVersion: "1.0 (11)" })],
  ["모르는 platform", () => stubLynx({ appVersion: { platform: "web", name: "1.0", build: 1 } })],
  ["문자열 build", () => stubLynx({ appVersion: { platform: "ios", name: "1.0", build: "11" } })],
  ["빈 name", () => stubLynx({ appVersion: { platform: "ios", name: "", build: 11 } })],
])("%s이면 unknown 셋이다", (_label, arrange) => {
  arrange();

  expect(readAppVersionProperties()).toBe(unknownAppVersionProperties);
});

// AV-U6
test("globalProps getter가 던져도 던지지 않고 unknown이다", () => {
  const lynxStub = {};
  Object.defineProperty(lynxStub, "__globalProps", {
    get() {
      throw new Error("getter");
    },
  });
  vi.stubGlobal("lynx", lynxStub);
  expect(() => readAppVersionProperties()).not.toThrow();
  expect(readAppVersionProperties()).toBe(unknownAppVersionProperties);

  const globalProps = {};
  Object.defineProperty(globalProps, "appVersion", {
    get() {
      throw new Error("getter");
    },
  });
  stubLynx(globalProps);
  expect(readAppVersionProperties()).toBe(unknownAppVersionProperties);
});

// AV-U7
test("모양이 하나라도 틀리면 셋 모두 unknown이다 — platform만 살아남지 않는다", () => {
  stubLynx({ appVersion: { platform: "android", name: "1.2.0", build: 1.5 } });

  expect(readAppVersionProperties()).toStrictEqual(unknownTriple);
});

// AV-U8
test("쌓아 두지 않는다 — 값이 바뀌면 다음 읽기에 반영된다", () => {
  const appVersion = { platform: "android", name: "1.2.0", build: 12 };
  stubLynx({ appVersion });
  expect(readAppVersionProperties().appBuild).toBe("12");

  appVersion.build = 13;
  expect(readAppVersionProperties().appBuild).toBe("13");
});

// AV-U9
test("Reflect.get이 던져도 정상 값을 읽는다 — 속성 접근으로만 읽는다", () => {
  stubLynx({ appVersion: android });
  const spy = vi.spyOn(Reflect, "get").mockImplementation(() => {
    throw new Error("Reflect.get");
  });
  const read = readAppVersionProperties();
  spy.mockRestore();

  expect(read).toStrictEqual({ platform: "android", appVersion: "1.2.0", appBuild: "12" });
});
