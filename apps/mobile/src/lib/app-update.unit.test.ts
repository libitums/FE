import { afterEach, describe, expect, test, vi } from "vitest";

import { appUpdateStoreOutcomeFrom, openAppStore } from "./app-update";

// `unit` 계층: 호스트 `AppUpdateModule` 접점(ADR-0086). `legal-document.unit.test.ts`와 같은 대역 형태입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("appUpdateStoreOutcomeFrom", () => {
  test.each(["opened", "failed", "unconfigured"] as const)("AU1. %s는 그대로다", (status) => {
    expect(appUpdateStoreOutcomeFrom({ status })).toBe(status);
  });

  test.each<[label: string, payload: unknown]>([
    ["null", null],
    ["문자열", "opened"],
    ["배열", [{ status: "opened" }]],
    ["모르는 status", { status: "closed" }],
    ["status 없음", {}],
  ])("AU2. %s는 malformed다", (_label, payload) => {
    expect(appUpdateStoreOutcomeFrom(payload)).toBe("malformed");
  });
});

describe("openAppStore", () => {
  test.each<[label: string, modules: unknown]>([
    ["NativeModules 없음", undefined],
    ["null", null],
    ["모듈 없음", {}],
    ["openStore가 함수 아님", { AppUpdateModule: { openStore: 1 } }],
    [
      "호출이 던짐",
      {
        AppUpdateModule: {
          openStore: () => {
            throw new Error("bridge");
          },
        },
      },
    ],
  ])("AU3. %s이면 unavailable로 resolve한다", async (_label, modules) => {
    vi.stubGlobal("NativeModules", modules);
    await expect(openAppStore()).resolves.toBe("unavailable");
  });

  test("AU4. 모듈이 있으면 인자 없이 한 번 부르고 콜백 결과로 resolve한다", async () => {
    const openStore = vi.fn<(callback: (payload: unknown) => void) => void>((callback) =>
      callback({ status: "opened" }),
    );
    vi.stubGlobal("NativeModules", { AppUpdateModule: { openStore } });
    await expect(openAppStore()).resolves.toBe("opened");
    expect(openStore).toHaveBeenCalledTimes(1);
    expect(openStore.mock.calls[0]).toHaveLength(1);
    expect(typeof openStore.mock.calls[0]![0]).toBe("function");

    openStore.mockImplementation((callback) => callback({ status: "unconfigured" }));
    await expect(openAppStore()).resolves.toBe("unconfigured");
    openStore.mockImplementation((callback) => callback("nope"));
    await expect(openAppStore()).resolves.toBe("malformed");
  });
});
