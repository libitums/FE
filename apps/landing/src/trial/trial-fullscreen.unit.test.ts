import { describe, expect, it } from "vitest";

import { createTrialFullscreen, fullscreenWanted } from "./trial-fullscreen";

// `unit` 계층: 모바일 전체화면 — 판정(순수)과 접점(가짜 창). 지원하지 않거나 거부돼도 던지지 않는다.

type FakeWindowOptions = {
  coarse: boolean;
  noHover: boolean;
  request?: "promise" | "reject" | "throw" | "webkit" | "none";
  fullscreenElement?: boolean;
};

function fakeWindow(options: FakeWindowOptions) {
  const calls: { kind: "request" | "exit"; arg?: unknown }[] = [];
  const element: Record<string, unknown> = {};
  const mode = options.request ?? "promise";
  if (mode === "promise") {
    element.requestFullscreen = (arg: unknown) => {
      calls.push({ kind: "request", arg });
      return Promise.resolve();
    };
  } else if (mode === "reject") {
    element.requestFullscreen = (arg: unknown) => {
      calls.push({ kind: "request", arg });
      return Promise.reject(new TypeError("not allowed"));
    };
  } else if (mode === "throw") {
    element.requestFullscreen = () => {
      calls.push({ kind: "request" });
      throw new Error("blocked");
    };
  } else if (mode === "webkit") {
    element.webkitRequestFullscreen = (arg: unknown) => {
      calls.push({ kind: "request", arg });
    };
  }
  const document: Record<string, unknown> = {
    documentElement: element,
    fullscreenElement: options.fullscreenElement ? element : null,
    exitFullscreen: () => {
      calls.push({ kind: "exit" });
      return Promise.resolve();
    },
  };
  const matches: Record<string, boolean> = {
    "(pointer: coarse)": options.coarse,
    "(hover: none)": options.noHover,
  };
  const scope = {
    document,
    matchMedia: (query: string) => ({ matches: matches[query] ?? false }),
  } as unknown as Window;
  return { scope, calls, document };
}

describe("fullscreenWanted", () => {
  it("FS1 굵은 포인터이고 hover가 없을 때만 참", () => {
    expect(fullscreenWanted({ coarsePointer: true, noHover: true })).toBe(true);
    expect(fullscreenWanted({ coarsePointer: true, noHover: false })).toBe(false);
    expect(fullscreenWanted({ coarsePointer: false, noHover: true })).toBe(false);
    expect(fullscreenWanted({ coarsePointer: false, noHover: false })).toBe(false);
  });
});

describe("createTrialFullscreen", () => {
  it("FS2 모바일 + 지원 → 한 번만 navigationUI hide로 부른다", () => {
    const { scope, calls } = fakeWindow({ coarse: true, noHover: true });
    const fullscreen = createTrialFullscreen(scope);
    fullscreen.request();
    fullscreen.request();
    expect(calls).toEqual([{ kind: "request", arg: { navigationUI: "hide" } }]);
  });

  it("FS2 webkit 접두 함수만 있으면 그것을 부른다", () => {
    const { scope, calls } = fakeWindow({ coarse: true, noHover: true, request: "webkit" });
    createTrialFullscreen(scope).request();
    expect(calls.filter((call) => call.kind === "request")).toHaveLength(1);
  });

  it("FS3 지원하지 않음 · 거부 · 던짐 · matchMedia 없음은 오류 0", async () => {
    for (const request of ["none", "reject", "throw"] as const) {
      const { scope } = fakeWindow({ coarse: true, noHover: true, request });
      expect(() => createTrialFullscreen(scope).request()).not.toThrow();
    }
    await Promise.resolve();
    const bare = { document: { documentElement: {} } } as unknown as Window;
    expect(() => createTrialFullscreen(bare).request()).not.toThrow();
    expect(() => createTrialFullscreen(bare).exit()).not.toThrow();
  });

  it("FS3 데스크톱(가는 포인터 · hover)은 부르지 않는다", () => {
    const { scope, calls } = fakeWindow({ coarse: false, noHover: false });
    createTrialFullscreen(scope).request();
    expect(calls).toEqual([]);
  });

  it("FS4 exit는 전체화면일 때만 부른다", () => {
    const off = fakeWindow({ coarse: true, noHover: true });
    createTrialFullscreen(off.scope).exit();
    expect(off.calls).toEqual([]);
    const on = fakeWindow({ coarse: true, noHover: true, fullscreenElement: true });
    createTrialFullscreen(on.scope).exit();
    expect(on.calls).toEqual([{ kind: "exit" }]);
  });
});
