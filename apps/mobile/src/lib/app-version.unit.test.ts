import { describe, expect, test } from "vitest";

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

describe("appVersionLabel", () => {
  test("AV4. 영어 표로 `Version 1.0 (11)`이다", () => {
    expect(appVersionLabel({ platform: "ios", name: "1.0", build: 11 }, uiCopyEn)).toBe(
      "Version 1.0 (11)",
    );
  });
});
