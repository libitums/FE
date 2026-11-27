// 덕수쌤 안내의 첫 인사를 기다리는 동안 보내기를 잠글지(ADR-0139 개정 2026-11-27). 순수 함수.
//
// 안내를 아직 안 본 사람이 덕수쌤 방에 처음 들어오면 기록을 읽고(loading) 첫 인사를 받는(typing) 몇 초가 있습니다. 그 사이 보낸 글은
// 첫 인사를 건너뛰게 하거나(기록이 비어 있지 않아 인사를 청하지 않음) 소리 없이 버려졌습니다. 첫 인사가 서거나 못 받으면(기록 실패 ·
// 인사 없음 · 상한 시간) 풉니다. 다른 방 · 안내를 본 사람 · 가짜 출처는 잠그지 않습니다.

import type { ChatThread } from "./chat-source.contract";

/** 첫 인사를 이만큼 기다려도 오지 않으면 풉니다 — 연결이 멈춰 방에 갇히지 않게. */
export const GREETING_LOCK_MAX_MS = 20_000;

export type GreetingLockInput = {
  /** 덕수쌤 방(`GUIDE_ROOM_ID`)인가. */
  readonly guideRoom: boolean;
  /** 방 안내(`room`)를 아직 안 봤는가 — 방에 들어올 때 한 번 읽은 값. */
  readonly roomUnseen: boolean;
  readonly thread: Pick<ChatThread, "typing" | "messages" | "server"> | null;
  /** 상한 시간이 지났는가. */
  readonly expired: boolean;
};

export function greetingLocked(input: GreetingLockInput): boolean {
  const { thread } = input;
  if (!input.guideRoom || !input.roomUnseen || input.expired) return false;
  if (thread === null || thread.server === null) return false;
  if (thread.messages.some((m) => m.kind === "text" && m.from === "them")) return false;
  return thread.server.history === "loading" || thread.typing;
}
