// Airbridge 사용자 식별 — 저장된 세션의 사용자를 SDK 사용자 ID로 맞춥니다(ADR-0090). 계약: `airbridge-events.contract.ts`.
// ID는 PostHog `identify`와 같은 Supabase user id(토큰의 `sub`)입니다. 이메일 · 전화번호는 보내지 않습니다.
// 로그인 순간이 아니라 세션이 바뀔 때마다 맞춥니다 — SDK가 ID를 기억하는지에 기대지 않고, 이미 로그인한 설치도 잇습니다.
// 백그라운드 전용 표시를 두지 않습니다 — 호스트는 effect(백그라운드)에서만 부르고, 모듈을 import 시점에 읽지 않습니다.

import type {
  AirbridgeEventsModule,
  AirbridgeEventsModuleName,
  AirbridgeUserIdFor,
  AirbridgeUserSync,
} from "./airbridge-events.contract";
import { authUserIdFrom } from "./auth-user-id";
import { testerAccessFrom } from "./tester-access";

const moduleName: AirbridgeEventsModuleName = "AirbridgeEventsModule";

export const airbridgeUserIdFor: AirbridgeUserIdFor = (accessToken) => {
  if (accessToken === null || testerAccessFrom(accessToken)) return null;
  return authUserIdFrom(accessToken);
};

function setHostUser(userId: string | null): void {
  if (typeof NativeModules === "undefined" || NativeModules === null) return;
  const host = (NativeModules as Record<string, unknown>)[moduleName] as
    | Partial<AirbridgeEventsModule>
    | undefined;
  try {
    if (userId === null) host?.clearUser?.();
    else host?.setUserID?.(userId);
  } catch {
    // 측정 실패가 화면을 막지 않습니다.
  }
}

export function createAirbridgeUserSync(): AirbridgeUserSync {
  let last: string | null | undefined;
  return (accessToken) => {
    const next = airbridgeUserIdFor(accessToken);
    if (next === last) return;
    last = next;
    setHostUser(next);
  };
}
