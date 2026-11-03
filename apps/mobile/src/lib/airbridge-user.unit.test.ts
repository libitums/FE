import { afterEach, expect, test, vi } from "vitest";

import { airbridgeUserIdFor, createAirbridgeUserSync } from "./airbridge-user";

// Airbridge 사용자 식별(ADR-0090). 저장된 세션의 사용자가 바뀔 때만 호스트를 부른다.

afterEach(() => {
  vi.unstubAllGlobals();
});

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 서명은 검증하지 않는 JWT 모양 토큰입니다.
function jwt(payload: Record<string, unknown>): string {
  return `${base64Url({ alg: "none" })}.${base64Url(payload)}.sig`;
}

const userA = jwt({ sub: "user-a" });
const userB = jwt({ sub: "user-b" });
const tester = jwt({ sub: "tester-1", app_metadata: { duru_tester: true } });

function stubHost(mode: "ok" | "throws" | "no-methods" | "absent"): string[] {
  const calls: string[] = [];
  const module =
    mode === "no-methods"
      ? { trackEvent: () => undefined }
      : {
          setUserID: (userId: string) => {
            calls.push(`set:${userId}`);
            if (mode === "throws") throw new Error("host setUserID failed");
          },
          clearUser: () => {
            calls.push("clear");
            if (mode === "throws") throw new Error("host clearUser failed");
          },
        };
  vi.stubGlobal("NativeModules", mode === "absent" ? {} : { AirbridgeEventsModule: module });
  return calls;
}

test("AU1. 시험 계정이 아닌 토큰은 sub, 없음 · 못 읽음 · 시험 계정은 null이다", () => {
  expect(airbridgeUserIdFor(userA)).toBe("user-a");
  expect(airbridgeUserIdFor(null)).toBeNull();
  expect(airbridgeUserIdFor("not-a-jwt")).toBeNull();
  expect(airbridgeUserIdFor(jwt({ sub: "" }))).toBeNull();
  expect(airbridgeUserIdFor(tester)).toBeNull();
});

test("AU2. 첫 관찰이 사용자면 setUserID 1회, 같은 사용자를 다시 보면 부르지 않는다", () => {
  const calls = stubHost("ok");
  const sync = createAirbridgeUserSync();

  sync(userA);
  sync(userA);
  sync(jwt({ sub: "user-a", exp: 1 }));

  expect(calls).toEqual(["set:user-a"]);
});

test("AU3. 다른 사용자로 바뀌면 그 ID로, 세션이 사라지면 clearUser를 1회 부른다", () => {
  const calls = stubHost("ok");
  const sync = createAirbridgeUserSync();

  sync(userA);
  sync(userB);
  sync(null);
  sync(null);

  expect(calls).toEqual(["set:user-a", "set:user-b", "clear"]);
});

test("AU4. 첫 관찰이 세션 없음이면 clearUser 1회다", () => {
  const calls = stubHost("ok");
  const sync = createAirbridgeUserSync();

  sync(null);
  sync("not-a-jwt");

  expect(calls).toEqual(["clear"]);
});

test("AU5. 시험 계정이 되면 식별을 지운다 — setUserID를 부르지 않는다", () => {
  const calls = stubHost("ok");
  const sync = createAirbridgeUserSync();

  sync(userA);
  sync(tester);

  expect(calls).toEqual(["set:user-a", "clear"]);
});

test.each(["absent", "no-methods", "throws"] as const)(
  "AU6. 호스트가 %s여도 던지지 않는다",
  (mode) => {
    const calls = stubHost(mode);
    const sync = createAirbridgeUserSync();

    expect(() => {
      sync(userA);
      sync(null);
    }).not.toThrow();
    expect(calls).toEqual(mode === "throws" ? ["set:user-a", "clear"] : []);
  },
);

test("AU7. NativeModules가 없어도 던지지 않는다", () => {
  vi.stubGlobal("NativeModules", undefined);
  const sync = createAirbridgeUserSync();

  expect(() => sync(userA)).not.toThrow();
});
