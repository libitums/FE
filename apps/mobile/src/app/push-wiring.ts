// 서버 푸시의 결선입니다(ADR-0034) — 기기 등록 · 해제와 설정 항목의 동작을 잇습니다. 누른 알림의 목적지로 가는
// 일은 `journey-wiring.ts`의 `onOpenPushTarget`이 집니다(여정 콜백을 다시 쓰기 때문입니다).
//
// **알림은 아무것도 막지 않습니다.** 모든 실패를 삼키고, 로그인 · 화면 전환은 이 결선을 기다리지 않습니다.

import { registerPushDevice, unregisterPushDevice } from "../lib/api-client";
import { loadAuthSession } from "../lib/auth-session";
import { authUserIdFrom } from "../lib/auth-user-id";
import {
  openPushSettings,
  pushAllowed,
  pushPermission,
  registerPushNotifications,
} from "../lib/push-notifications";

// 이 실행에서 등록에 성공한 서로 다른 토큰 전부입니다(등록 성공 순). 토큰이 실행 중 바뀌어 두 등록의 응답이
// 뒤바뀌어도 로그아웃이 각각을 해제합니다 — 저장하지 않습니다(ADR-0007 D1).
const registeredTokens = new Set<string>();

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
    // RPC를 보낼 때 쓴 액세스 토큰의 사용자에게 서버 행이 생기므로, 그 토큰을 기준으로 잡아 둡니다.
    const { accessToken } = session;
    const startedUser = authUserIdFrom(accessToken);
    if (!(await registerPushDevice(accessToken, device))) return;
    const current = loadAuthSession();
    // 사용자를 판정할 수 없으면(`sub` 없음) 같은 사용자로 보고 등록을 유지합니다 — 푸시를 끊는 쪽이 더 나쁜 실패입니다.
    const sameUser =
      current !== null &&
      (startedUser === null ||
        authUserIdFrom(current.accessToken) === null ||
        authUserIdFrom(current.accessToken) === startedUser);
    if (sameUser) registeredTokens.add(device.token);
    // 로그아웃 · 계정 전환 뒤에 도착한 등록은 집합에 넣지 않고, 시작한 세션의 인증으로 해제합니다.
    else void unregisterPushDevice(accessToken, device.token).catch(() => undefined);
  } catch {
    // 알림은 아무것도 막지 않습니다.
  }
}

/** 로그아웃 직전에 부릅니다 — 이 기기가 떠난 사용자의 알림을 받지 않게 합니다. 기다리지 않아도 됩니다. */
export function forgetPushDevice(accessToken: string): void {
  const tokens = [...registeredTokens];
  registeredTokens.clear();
  for (const token of tokens) void unregisterPushDevice(accessToken, token).catch(() => undefined);
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
  registeredTokens.clear();
}
