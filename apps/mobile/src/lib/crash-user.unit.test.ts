import { afterEach, expect, test, vi } from "vitest";

import { crashUserIdFrom, setCrashUser } from "./crash-user";

// 오류 수집의 사용자는 내부 ID 하나다(ADR-0207 D3). 호스트가 없거나 던져도 로그인 · 로그아웃을 막지 않는다.

const id = "3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubHost(host: Record<string, unknown> | undefined) {
  vi.stubGlobal("NativeModules", host === undefined ? {} : { CrashReportingModule: host });
}

function recordingHost() {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    CrashReportingModule: {
      setUser: (userId: string) => calls.push(`setUser:${userId}`),
      clearUser: () => calls.push("clearUser"),
    },
  });
  return calls;
}

test("CU1. UUID 꼴만 받아 소문자로 돌려준다 — 앞뒤 공백은 떼고, 그 밖은 null", () => {
  expect(crashUserIdFrom(id)).toBe(id);
  expect(crashUserIdFrom(` ${id.toUpperCase()} `)).toBe(id);
  expect(crashUserIdFrom("u1")).toBeNull();
  expect(crashUserIdFrom("kim@example.com")).toBeNull();
  expect(crashUserIdFrom("")).toBeNull();
  expect(crashUserIdFrom(null)).toBeNull();
  expect(crashUserIdFrom(undefined)).toBeNull();
  expect(crashUserIdFrom(`${id}x`)).toBeNull();
});

test("CU2. ID면 setUser 하나, null이면 clearUser 하나를 부르고 true", () => {
  const calls = recordingHost();

  expect(setCrashUser(id)).toBe(true);
  expect(setCrashUser(null)).toBe(true);
  expect(calls).toEqual([`setUser:${id}`, "clearUser"]);
});

test("CU3. UUID 꼴이 아닌 ID는 넘기지 않고 지운다 — 앞 사용자가 남지 않게", () => {
  const calls = recordingHost();

  expect(setCrashUser("kim@example.com")).toBe(true);
  expect(calls).toEqual(["clearUser"]);
});

test("CU4. 호스트 모듈이 없으면 false이고 던지지 않는다", () => {
  stubHost(undefined);
  expect(setCrashUser(id)).toBe(false);
  expect(setCrashUser(null)).toBe(false);

  vi.stubGlobal("NativeModules", undefined);
  expect(setCrashUser(id)).toBe(false);
});

test("CU5. 호스트가 던지면 삼키고 false", () => {
  stubHost({
    setUser: () => {
      throw new Error("host");
    },
    clearUser: () => {
      throw new Error("host");
    },
  });

  expect(setCrashUser(id)).toBe(false);
  expect(setCrashUser(null)).toBe(false);
});
