// 앱이 앞에 있을 때 온 인물의 채팅 메시지 푸시(ADR-0200 개정) — 호스트가 시스템 배너 대신 인물 id만 넘깁니다
// (iOS `willPresent` · Android 앞에 있는 Activity). 출처가 그 방 기록을 다시 읽고, 새 말이면 답장 토스트가 같은 규칙으로 섭니다.

import type { ChatSource } from "../screens/messenger-chat/chat-source.contract";
import { companionRoomFor } from "./companion-push";
import { pushTargetFrom } from "./push-target";

export const pushReceivedEventName = "pushNotificationReceived";

/** 다시 읽을 방 id — 인물 id 형식이 틀리거나 기기에 열 수 있는 방이 없으면 null(아무것도 하지 않음). */
export function foregroundChatPushRoom(source: ChatSource, raw: unknown): string | null {
  // 형식 검증은 누른 알림 목적지와 같은 규칙(`push-target.ts`)을 씁니다.
  const target = pushTargetFrom({ kind: "companion-chat", characterId: raw });
  return target?.kind === "companion-chat" ? companionRoomFor(source, target.characterId) : null;
}
