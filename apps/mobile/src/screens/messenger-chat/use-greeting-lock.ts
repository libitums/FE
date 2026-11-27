// 덕수쌤 안내의 첫 인사를 기다리는 동안의 보내기 잠금(`greeting-lock.ts`)에 상한 시간을 붙입니다(ADR-0139 개정 2026-11-27).
// 잠금이 이어진 지 `GREETING_LOCK_MAX_MS`가 지나면 이 방이 떠 있는 동안 다시 잠그지 않습니다 — 연결이 멈춰도 갇히지 않게.

import { useEffect, useState } from "@lynx-js/react";

import type { ChatThread } from "./chat-source.contract";
import { GREETING_LOCK_MAX_MS, greetingLocked } from "./greeting-lock";

export function useGreetingLock(
  guideRoom: boolean,
  roomUnseen: boolean,
  thread: ChatThread | null,
): boolean {
  const [expired, setExpired] = useState(false);
  const waiting = greetingLocked({ guideRoom, roomUnseen, thread, expired });
  useEffect(() => {
    if (!waiting) return;
    const handle = setTimeout(() => setExpired(true), GREETING_LOCK_MAX_MS);
    return () => clearTimeout(handle);
  }, [waiting]);
  return waiting;
}
