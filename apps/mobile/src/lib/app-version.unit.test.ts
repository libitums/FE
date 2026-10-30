import { describe, expect, test, vi } from "vitest";

import { appVersionFrom, appVersionLabel } from "./app-version";
import { uiCopyEn } from "./ui-copy-en";

// `unit` 계층: 호스트 globalProps `appVersion`을 읽는 순수 함수(ADR-0086).

describe("appVersionFrom", () => {
  test("AV1. iOS · Android 모양이 맞으면 셋을 그대로 돌려준다", () => {
    expect(appVersionFrom({ appVersion: { platform: "ios", name: "1.0", build: 11 } })).toEqual({
      platform: "ios",
      name: "1.0",
      build: 11,
    });
    expect(
      appVersionFrom({
        safeAreaInsets: {},
        appVersion: { platform: "android", name: "0.1.0", build: 6 },
      }),
    ).toEqual({ platform: "android", name: "0.1.0", build: 6 });
  });

  test.each<[label: string, globalProps: unknown]>([
    ["undefined", undefined],
    ["null", null],
    ["문자열", "1.0"],
    ["키 없음", { safeAreaInsets: {} }],
    ["값이 문자열", { appVersion: "1.0 (11)" }],
    ["platform 모름", { appVersion: { platform: "web", name: "1.0", build: 11 } }],
    ["build가 문자열", { appVersion: { platform: "ios", name: "1.0", build: "11" } }],
    ["build가 소수", { appVersion: { platform: "ios", name: "1.0", build: 1.5 } }],
    ["build가 음수", { appVersion: { platform: "ios", name: "1.0", build: -1 } }],
    ["build가 NaN", { appVersion: { platform: "ios", name: "1.0", build: Number.NaN } }],
    ["name이 빈 문자열", { appVersion: { platform: "ios", name: "", build: 11 } }],
    ["name이 숫자", { appVersion: { platform: "ios", name: 1, build: 11 } }],
  ])("AV2. %s이면 null이다", (_label, globalProps) => {
    expect(appVersionFrom(globalProps)).toBeNull();
  });

  test("AV3. build 0은 허용한다(정수 0 이상)", () => {
    expect(
      appVersionFrom({ appVersion: { platform: "android", name: "0.0.1", build: 0 } }),
    ).toEqual({
      platform: "android",
      name: "0.0.1",
      build: 0,
    });
  });
});

// Android 메인 스레드의 globalProps는 `Reflect.get`이 `not an object`를 던지는 엔진 값입니다(DURU-ANDROID-A).
// Node에서는 재현되지 않아 `Reflect.get`이 던지게 해 두고 읽기가 그것에 기대지 않는지 봅니다.
describe("appVersionFrom — Android 메인 스레드", () => {
  test("AV5. Reflect.get이 던지는 환경에서도 값을 읽는다", () => {
    const spy = vi.spyOn(Reflect, "get").mockImplementation(() => {
      throw new TypeError("not an object");
    });
    // `expect`도 안에서 `Reflect.get`을 쓰므로 읽기만 가로챈 채로 하고 비교는 되돌린 뒤에 합니다.
    let read: ReturnType<typeof appVersionFrom> | Error;
    try {
      read = appVersionFrom({ appVersion: { platform: "android", name: "1.0.0", build: 9 } });
    } catch (error) {
      read = error as Error;
    } finally {
      spy.mockRestore();
    }
    expect(read).toEqual({ platform: "android", name: "1.0.0", build: 9 });
  });
});

describe("appVersionLabel", () => {
  test("AV4. 영어 표로 `Version 1.0 (11)`이다", () => {
    expect(appVersionLabel({ platform: "ios", name: "1.0", build: 11 }, uiCopyEn)).toBe(
      "Version 1.0 (11)",
    );
  });
});
