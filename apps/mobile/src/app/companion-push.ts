// 선톡 푸시(companion-chat)를 누른 뒤의 이동입니다(ADR-0127) — 열 수 있는 방이면 그 방, 아니면 메신저 목록 + 안내.
// 잠긴 방이면 열고 들어갑니다(사용자 결정 2026-11-22): 선톡은 서버에 그 인물과의 대화가 있어야 오므로, 기기에서 잠겨 있다면
// 재설치 · 새 기기로 해금 기록(기기 저장)만 사라진 것입니다.

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

/**
 * 메신저 탭을 루트로 접고 → 방을 쌓거나, 메신저 루트 목록에만 안내를 붙입니다(활성 스택을 바꾸지 않는다).
 * 잠긴 방은 먼저 엽니다 — 열었으면 `onRestored`로 해금 기록(기기 저장)을 남기게 합니다.
 */
export function companionPushActions(
  source: ChatSource,
  characterId: string,
  canOpenChats: boolean,
  onRestored?: (characterId: string) => void,
): readonly NavAction[] {
  // 메신저를 쓸 수 없는 계정(ADR-0128)이면 메신저 탭 루트(그 계정의 안내)에서 멈춥니다 — 방 · 「열 수 없음」 안내를 띄우지 않는다.
  if (!canOpenChats) return tabRootActions("messenger");
  // 연령 제한 방은 열어도 상태 줄뿐이라 잠긴 채 둡니다.
  const locked = source
    .snapshot()
    .rooms.find((each) => each.counterpart.id === characterId && each.access.kind === "locked");
  if (
    locked !== undefined &&
    source.thread(locked.roomId)?.inputBlock?.kind !== "age-restricted" &&
    source.unlockCharacter(characterId).kind === "unlocked"
  )
    onRestored?.(characterId);
  const roomId = companionRoomFor(source, characterId);
  const next: NavAction =
    roomId === null
      ? { type: "setListNotice", notice: "chat-unavailable" }
      : { type: "push", screen: { name: "messenger-chat", roomId } };
  return [...tabRootActions("messenger"), next];
}
