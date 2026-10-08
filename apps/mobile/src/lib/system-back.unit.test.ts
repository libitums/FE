import { afterEach, describe, expect, it, vi } from "vitest";

import { answerSystemBack, notifySystemBackReady, systemBackTokenFrom } from "./system-back";
import type { SystemBackToken } from "./system-back.contract";

// DOM·컴포넌트를 import하지 않습니다 — 호스트 경계를 감싼 접점 하나만 봅니다.
// 전역 대역은 테스트마다 원상복구합니다(accessibility.unit.test.ts와 같은 규율).

const token = "7" as SystemBackToken;

type HostCall = { args: readonly unknown[] };

function stubHost(): { ready: HostCall[]; respond: HostCall[] } {
  const ready: HostCall[] = [];
  const respond: HostCall[] = [];
  vi.stubGlobal("NativeModules", {
    SystemBackModule: {
      ready: (...args: readonly unknown[]) => void ready.push({ args }),
      respond: (...args: readonly unknown[]) => void respond.push({ args }),
    },
  });
  return { ready, respond };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("systemBackTokenFrom", () => {
  it("SB1. 비어 있지 않은 문자열은 그대로 토큰이다", () => {
    expect(systemBackTokenFrom("7")).toBe("7");
  });

  it("SB2. 빈 문자열 · 수 · undefined · null · 객체 · 배열은 null이다", () => {
    for (const payload of ["", 7, undefined, null, { token: "7" }, ["7"]]) {
      expect(systemBackTokenFrom(payload)).toBeNull();
    }
  });
});

describe("호스트 호출", () => {
  it("SB3. 모듈이 있으면 notifySystemBackReady가 ready를 한 번 부르고 requested다", () => {
    const calls = stubHost();
    expect(notifySystemBackReady()).toBe("requested");
    expect(calls.ready).toHaveLength(1);
    expect(calls.respond).toHaveLength(0);
  });

  it("SB4. answerSystemBack은 respond(token, outcome)를 한 번 부르고 requested다", () => {
    const leave = stubHost();
    expect(answerSystemBack(token, "leave")).toBe("requested");
    expect(leave.respond).toEqual([{ args: ["7", "leave"] }]);

    const handled = stubHost();
    expect(answerSystemBack(token, "handled")).toBe("requested");
    expect(handled.respond).toEqual([{ args: ["7", "handled"] }]);
  });
});

describe("호스트에 없거나 이상한 환경", () => {
  it("SB5. NativeModules가 없음 · null · SystemBackModule 없음/null이면 둘 다 unavailable이고 던지지 않는다", () => {
    const environments: unknown[] = [undefined, null, {}, { SystemBackModule: null }];
    for (const environment of environments) {
      vi.stubGlobal("NativeModules", environment);
      expect(() => notifySystemBackReady()).not.toThrow();
      expect(notifySystemBackReady()).toBe("unavailable");
      expect(() => answerSystemBack(token, "leave")).not.toThrow();
      expect(answerSystemBack(token, "leave")).toBe("unavailable");
    }
  });

  it("SB6. ready · respond가 함수가 아니면 unavailable이다", () => {
    vi.stubGlobal("NativeModules", { SystemBackModule: { ready: 1, respond: "x" } });
    expect(notifySystemBackReady()).toBe("unavailable");
    expect(answerSystemBack(token, "leave")).toBe("unavailable");
  });

  it("SB7. 호스트 함수가 던져도 unavailable이고 밖으로 던지지 않는다", () => {
    const boom = () => {
      throw new Error("boom");
    };
    vi.stubGlobal("NativeModules", { SystemBackModule: { ready: boom, respond: boom } });
    expect(() => notifySystemBackReady()).not.toThrow();
    expect(notifySystemBackReady()).toBe("unavailable");
    expect(() => answerSystemBack(token, "leave")).not.toThrow();
    expect(answerSystemBack(token, "leave")).toBe("unavailable");
  });
});
