// 선톡 푸시(companion-chat)를 누른 뒤의 이동입니다(ADR-0127) — 열 수 있는 방이면 그 방, 아니면 메신저 목록 + 안내.

import type { ChatSource } from "../screens/messenger-chat/chat-source.contract";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

/**
 * 그 인물의 방 중 열 수 있는 방 id입니다. 없음 · 잠김 · 연령 제한이면 null — 연령 제한 방은 열어도 상태 줄뿐이라 목록 안내로
 * 대신합니다. 일시 차단 · 하루 시간 상한은 방 안 상태 줄이 언제 풀리는지 알려 주므로 엽니다.
 */
export function companionRoomFor(source: ChatSource, characterId: string): string | null {
  const room = source.snapshot().rooms.find((each) => each.counterpart.id === characterId);
  if (room === undefined || room.access.kind !== "open") return null;
  if (source.thread(room.roomId)?.inputBlock?.kind === "age-restricted") return null;
  return room.roomId;
}

/** 메신저 탭을 루트로 접고 → 방을 쌓거나, 메신저 루트 목록에만 안내를 붙입니다(활성 스택을 바꾸지 않는다). */
export function companionPushActions(
  source: ChatSource,
  characterId: string,
): readonly NavAction[] {
  const roomId = companionRoomFor(source, characterId);
  const next: NavAction =
    roomId === null
      ? { type: "setListNotice", notice: "chat-unavailable" }
      : { type: "push", screen: { name: "messenger-chat", roomId } };
  return [...tabRootActions("messenger"), next];
}
