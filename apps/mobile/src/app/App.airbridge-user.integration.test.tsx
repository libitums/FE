import { afterEach, expect, test, vi } from "vitest";

import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 「App 부팅 → 세션 갱신 → 저장된 토큰 → 사용자 동기화 → NativeModules.AirbridgeEventsModule」을 한 트리에서
// 봅니다(ADR-0090). 대역은 호스트 모듈(`setUserID` · `clearUser` 기록) · 저장소 · fetch뿐입니다.
// 부팅 세션의 토큰은 JWT가 아니라(첫 관찰 = 사용자 없음) 갱신된 토큰부터 사용자가 보입니다.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jwt(payload: Record<string, unknown>): string {
  return `${base64Url({ alg: "none" })}.${base64Url(payload)}.sig`;
}

function stubAirbridgeUserHost(): string[] {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    AirbridgeEventsModule: {
      trackEvent: () => undefined,
      setUserID: (userId: string) => void calls.push(`set:${userId}`),
      clearUser: () => void calls.push("clear"),
    },
  });
  return calls;
}

test("AUI1. 로그인된 설치가 부팅해 세션을 갱신하면 그 사용자 ID로 setUserID가 정확히 1회 불린다", async () => {
  const calls = stubAirbridgeUserHost();

  await renderSignedInApp(<App />, { refreshedAccessToken: jwt({ sub: "user-42" }) });

  await vi.waitFor(() => expect(calls).toContain("set:user-42"));
  expect(calls.filter((call) => call.startsWith("set:"))).toEqual(["set:user-42"]);
});

test("AUI2. 시험 계정으로 갱신되면 setUserID를 부르지 않는다", async () => {
  const calls = stubAirbridgeUserHost();

  await renderSignedInApp(<App />, {
    refreshedAccessToken: jwt({ sub: "tester-1", app_metadata: { duru_tester: true } }),
  });
  await new Promise((resolve) => setTimeout(resolve, 30));

  expect(calls.filter((call) => call.startsWith("set:"))).toEqual([]);
});
