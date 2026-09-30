import { afterEach, describe, expect, test, vi } from "vitest";

import {
  openPushSettings,
  pushAllowed,
  pushPermission,
  pushPermissionFrom,
  pushRegistrationFrom,
  registerPushNotifications,
  takeOpenedPushTarget,
} from "./push-notifications";

const token = "a1".repeat(32);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PU1 pushPermissionFrom", () => {
  test("낱말 넷만 읽고 그 밖은 null", () => {
    for (const permission of ["not-determined", "denied", "authorized", "provisional"] as const) {
      expect(pushPermissionFrom({ permission })).toBe(permission);
    }
    expect(pushPermissionFrom({ permission: "granted" })).toBeNull();
    expect(pushPermissionFrom("authorized")).toBeNull();
    expect(pushPermissionFrom(null)).toBeNull();
  });
});

describe("PU2 pushRegistrationFrom", () => {
  test("토큰 · 환경이 맞을 때만 기기가 선다", () => {
    expect(
      pushRegistrationFrom({ permission: "authorized", token, environment: "sandbox" }),
    ).toEqual({ permission: "authorized", device: { token, environment: "sandbox" } });
    expect(pushRegistrationFrom({ permission: "authorized", token, environment: "dev" })).toEqual({
      permission: "authorized",
      device: null,
    });
    expect(
      pushRegistrationFrom({ permission: "authorized", token: "XYZ", environment: "production" }),
    ).toEqual({ permission: "authorized", device: null });
    expect(pushRegistrationFrom({ permission: "denied" })).toEqual({
      permission: "denied",
      device: null,
    });
    expect(pushRegistrationFrom({ token })).toBeNull();
  });
});

describe("PU3 pushAllowed", () => {
  test("허용 · 임시 허용만 true", () => {
    expect(pushAllowed("authorized")).toBe(true);
    expect(pushAllowed("provisional")).toBe(true);
    expect(pushAllowed("denied")).toBe(false);
    expect(pushAllowed("not-determined")).toBe(false);
    expect(pushAllowed(null)).toBe(false);
  });
});

describe("PU4 호스트 접점", () => {
  test("모듈이 없으면 null이고 던지지 않는다", async () => {
    await expect(pushPermission()).resolves.toBeNull();
    await expect(registerPushNotifications()).resolves.toBeNull();
    await expect(takeOpenedPushTarget()).resolves.toBeNull();
    expect(() => openPushSettings()).not.toThrow();
  });

  test("모듈 응답을 읽는다", async () => {
    const openSettings = vi.fn<() => void>();
    vi.stubGlobal("NativeModules", {
      PushNotificationModule: {
        getStatus: (callback: (payload: unknown) => void) => callback({ permission: "denied" }),
        register: (callback: (payload: unknown) => void) =>
          callback({ permission: "authorized", token, environment: "production" }),
        takeOpened: (callback: (payload: unknown) => void) =>
          callback({ target: { kind: "notifications" } }),
        openSettings,
      },
    });
    await expect(pushPermission()).resolves.toBe("denied");
    await expect(registerPushNotifications()).resolves.toEqual({
      permission: "authorized",
      device: { token, environment: "production" },
    });
    await expect(takeOpenedPushTarget()).resolves.toEqual({ kind: "notifications" });
    openPushSettings();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  test("호출이 던지면 null", async () => {
    vi.stubGlobal("NativeModules", {
      PushNotificationModule: {
        getStatus: () => {
          throw new Error("bridge");
        },
      },
    });
    await expect(pushPermission()).resolves.toBeNull();
  });
});
