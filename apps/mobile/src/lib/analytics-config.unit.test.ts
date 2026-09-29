import { afterEach, describe, expect, test, vi } from "vitest";

import { analyticsConfig, analyticsConfigFrom, postHogHost } from "./analytics-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("postHogHost", () => {
  test("AC1: 수집 호스트는 US Cloud로 고정이다", () => {
    expect(postHogHost).toBe("https://us.i.posthog.com");
  });
});

describe("analyticsConfigFrom", () => {
  test("AC2: phc_ 키는 호스트와 함께 설정이 된다", () => {
    expect(analyticsConfigFrom("phc_abc")).toStrictEqual({
      projectKey: "phc_abc",
      host: postHogHost,
    });
  });

  test("AC2: 앞뒤 공백은 걷어 낸다", () => {
    expect(analyticsConfigFrom("  phc_abc \n")).toStrictEqual({
      projectKey: "phc_abc",
      host: postHogHost,
    });
  });

  test.each<[label: string, input: unknown]>([
    ["undefined", undefined],
    ["null", null],
    ["숫자", 42],
    ["빈 문자열", ""],
    ["공백만", "   "],
    ["접두만", "phc_"],
    ["개인 키(phx_)", "phx_abc"],
    ["접두 없음", "abc"],
    ["대문자 접두", "PHC_abc"],
    ["안쪽 공백", "phc_a b"],
  ])("AC3: %s는 null이다", (_label, input) => {
    expect(analyticsConfigFrom(input)).toBeNull();
  });
});

describe("analyticsConfig", () => {
  test("AC4: PUBLIC_POSTHOG_KEY를 읽어 설정을 만든다", () => {
    vi.stubEnv("PUBLIC_POSTHOG_KEY", "phc_env");
    expect(analyticsConfig()).toStrictEqual({ projectKey: "phc_env", host: postHogHost });
  });

  test("AC4: 빈 값이면 null이다", () => {
    vi.stubEnv("PUBLIC_POSTHOG_KEY", "");
    expect(analyticsConfig()).toBeNull();
  });

  test("AC4: 호출마다 읽는다", () => {
    vi.stubEnv("PUBLIC_POSTHOG_KEY", "");
    expect(analyticsConfig()).toBeNull();
    vi.stubEnv("PUBLIC_POSTHOG_KEY", "phc_later");
    expect(analyticsConfig()?.projectKey).toBe("phc_later");
  });
});
