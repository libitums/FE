import { afterEach, describe, expect, test, vi } from "vitest";

import { NON_ERROR_THROWN_MESSAGE, crashReportableFrom, reportCrash } from "./crash-report";

afterEach(() => {
  vi.unstubAllGlobals();
});

class AppError extends Error {}

describe("crashReportableFrom", () => {
  test("K1: Error와 하위 클래스 인스턴스는 같은 참조로 돌려준다", () => {
    const plain = new Error("a");
    const typed = new TypeError("b");
    const custom = new AppError("c");
    expect(crashReportableFrom(plain)).toBe(plain);
    expect(crashReportableFrom(typed)).toBe(typed);
    expect(crashReportableFrom(custom)).toBe(custom);
  });

  test("K2: 문자열은 그대로, 그 밖의 값은 고정 문구의 Error가 된다", () => {
    expect(crashReportableFrom("boom")).toBe("boom");
    const others: unknown[] = [{ a: 1 }, 42, null, undefined, Symbol("s")];
    expect(others.length).toBe(5);
    for (const value of others) {
      const result = crashReportableFrom(value);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe(NON_ERROR_THROWN_MESSAGE);
    }
  });

  test("K2: 읽으면 던지는 getter가 든 객체도 던지지 않는다", () => {
    const hostile = {
      get message(): string {
        throw new Error("getter");
      },
      toString(): string {
        throw new Error("toString");
      },
    };
    let result: unknown;
    expect(() => {
      result = crashReportableFrom(hostile);
    }).not.toThrow();
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe(NON_ERROR_THROWN_MESSAGE);
  });
});

describe("reportCrash", () => {
  test("K3: lynx.reportError를 정확히 한 번, 같은 참조로, 인자 하나만 부른다", () => {
    const spy = vi.fn();
    vi.stubGlobal("lynx", { reportError: spy });
    const err = new Error("render failed");
    reportCrash(err);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    expect(spy.mock.calls[0]?.[0]).toBe(err);
  });

  test("K4: lynx가 없으면 던지지 않는다", () => {
    vi.stubGlobal("lynx", undefined);
    expect(() => reportCrash(new Error("x"))).not.toThrow();
  });

  test("K4: lynx.reportError가 함수가 아니면 던지지 않는다", () => {
    vi.stubGlobal("lynx", { reportError: "nope" });
    expect(() => reportCrash(new Error("x"))).not.toThrow();
    vi.stubGlobal("lynx", {});
    expect(() => reportCrash(new Error("x"))).not.toThrow();
  });

  test("K5: lynx.reportError가 던져도 삼킨다", () => {
    const spy = vi.fn(() => {
      throw new Error("channel down");
    });
    vi.stubGlobal("lynx", { reportError: spy });
    expect(() => reportCrash(new Error("x"))).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("NON_ERROR_THROWN_MESSAGE", () => {
  test("K6: ASCII 문자만 쓴다", () => {
    expect(NON_ERROR_THROWN_MESSAGE).toMatch(/^[\x20-\x7E]+$/);
  });
});
