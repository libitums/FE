// 서버 푸시의 결선입니다(ADR-0034) — 기기 등록 · 해제와 설정 항목의 동작을 잇습니다. 누른 알림의 목적지로 가는
// 일은 `journey-wiring.ts`의 `onOpenPushTarget`이 집니다(여정 콜백을 다시 쓰기 때문입니다).
//
// **알림은 아무것도 막지 않습니다.** 모든 실패를 삼키고, 로그인 · 화면 전환은 이 결선을 기다리지 않습니다.

import { registerPushDevice, unregisterPushDevice } from "../lib/api-client";
import { loadAuthSession } from "../lib/auth-session";
import {
  openPushSettings,
  pushAllowed,
  pushPermission,
  registerPushNotifications,
} from "../lib/push-notifications";

// 이 실행에서 등록한 토큰입니다. 로그아웃이 이 값으로 해제합니다 — 저장하지 않습니다(ADR-0007 D1).
let registeredToken: string | null = null;

/**
 * 로그인한 사용자의 이 기기를 등록합니다. `ask`면 미요청일 때 시스템 다이얼로그를 띄웁니다(진입 흐름 끝 ·
 * 설정 항목). 아니면 이미 허용된 경우에만 조용히 토큰을 받습니다(부팅 때 — 마지막 활동 시각도 갱신됩니다).
 */
export async function syncPushDevice({ ask }: { readonly ask: boolean }): Promise<void> {
  try {
    if (loadAuthSession() === null) return;
    if (!ask && !pushAllowed(await pushPermission())) return;
    const registration = await registerPushNotifications();
    const device = registration?.device ?? null;
    // 다이얼로그를 기다리는 동안 로그아웃했을 수 있어 세션을 다시 읽습니다.
    const session = loadAuthSession();
    if (device === null || session === null) return;
    if (await registerPushDevice(session.accessToken, device)) registeredToken = device.token;
  } catch {
    // 알림은 아무것도 막지 않습니다.
  }
}

/** 로그아웃 직전에 부릅니다 — 이 기기가 떠난 사용자의 알림을 받지 않게 합니다. 기다리지 않아도 됩니다. */
export function forgetPushDevice(accessToken: string): void {
  const token = registeredToken;
  registeredToken = null;
  if (token === null) return;
  void unregisterPushDevice(accessToken, token).catch(() => undefined);
}

/** 설정의 `Notifications` — 미요청이면 묻고, 물었으면 이 앱의 시스템 알림 설정을 엽니다. */
export async function openNotificationSettings(): Promise<void> {
  const permission = await pushPermission();
  if (permission === "not-determined") {
    await syncPushDevice({ ask: true });
    return;
  }
  openPushSettings();
}

/** 테스트만 부릅니다 — 모듈 상태를 비웁니다. */
export function resetPushWiringForTests(): void {
  registeredToken = null;
}
