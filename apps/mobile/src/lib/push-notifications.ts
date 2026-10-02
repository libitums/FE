// 호스트 모듈 `PushNotificationModule`의 JS 접점입니다(ADR-0034). 모듈이 없으면 권한은 `null`, 등록은
// `null`, 누른 알림은 `null`이고 아무것도 던지지 않습니다.

import type {
  PushDevice,
  PushNotificationModule,
  PushPermission,
  PushPermissionFrom,
  PushRegistration,
  PushRegistrationFrom,
} from "./push-notifications.contract";

const permissions: readonly PushPermission[] = [
  "not-determined",
  "denied",
  "authorized",
  "provisional",
];

const tokenPattern = /^[0-9a-f]{64,200}$/;
const fcmTokenPattern = /^fcm\.[A-Za-z0-9_-]{27,4096}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const pushPermissionFrom: PushPermissionFrom = (payload) => {
  const permission = asRecord(payload)?.["permission"];
  return permissions.find((value) => value === permission) ?? null;
};

export const pushRegistrationFrom: PushRegistrationFrom = (payload) => {
  const permission = pushPermissionFrom(payload);
  if (permission === null) return null;
  const record = asRecord(payload);
  const token = record?.["token"];
  const environment = record?.["environment"];
  const device: PushDevice | null =
    typeof token === "string" &&
    ((environment === "fcm" && fcmTokenPattern.test(token)) ||
      ((environment === "sandbox" || environment === "production") && tokenPattern.test(token)))
      ? { token, environment }
      : null;
  return { permission, device };
};

/** 허용(임시 허용 포함)이면 알림이 보입니다. */
export function pushAllowed(permission: PushPermission | null): boolean {
  return permission === "authorized" || permission === "provisional";
}

function nativeModule(): PushNotificationModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["PushNotificationModule"] as
    | PushNotificationModule
    | undefined;
  return module ?? undefined;
}

function call<T>(
  method: "getStatus" | "register" | "takeOpened",
  read: (payload: unknown) => T | null,
): Promise<T | null> {
  const host = nativeModule();
  if (host === undefined || typeof host[method] !== "function") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      host[method]((payload) => resolve(read(payload)));
    } catch {
      resolve(null);
    }
  });
}

/** 권한 상태만 읽습니다 — 다이얼로그를 띄우지 않습니다. */
export function pushPermission(): Promise<PushPermission | null> {
  return call("getStatus", pushPermissionFrom);
}

/** 미요청이면 시스템 다이얼로그를 띄우고, 허용이면 기기 토큰까지 받습니다. 거부 상태면 묻지 않습니다. */
export function registerPushNotifications(): Promise<PushRegistration | null> {
  return call("register", pushRegistrationFrom);
}

/** 사용자가 누른 알림의 목적지(검증 전 값)를 한 번 꺼냅니다. 없으면 `null`. */
export function takeOpenedPushTarget(): Promise<unknown> {
  return call("takeOpened", (payload) => asRecord(payload)?.["target"] ?? null);
}

/** 이 앱의 알림 설정 페이지를 엽니다. 모듈이 없으면 아무 일도 없습니다. */
export function openPushSettings(): void {
  const host = nativeModule();
  if (host === undefined || typeof host.openSettings !== "function") return;
  try {
    host.openSettings();
  } catch {
    // 설정을 못 열어도 화면은 그대로입니다.
  }
}
