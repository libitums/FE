// 프로필 시트의 제품 이벤트입니다(ADR-0162 2026-11-19 추가 · ADR-0029 「D3 목적 구분」). 순수 — 보내기는 `useChatEvents().emit`.

import type { CompanionEventInput } from "../../lib/companion-event.contract";
import type { FriendProfileSource } from "./friend-profile.contract";

/** 시트가 열렸음 — 줄 · 친구 찾기 · 방 머리에서 연 그때 한 번. */
export function profileOpenedEvent(
  characterId: string,
  source: FriendProfileSource,
): CompanionEventInput {
  return { name: "friend_profile_opened", surface: "chat", characterId, source };
}

/** 견본이 새로 틀어졌음 — 훅이 `startedPlayback`일 때만 부릅니다(이어 듣기 · 멈춤 · 실패는 세지 않음). */
export function voicePlayedEvent(characterId: string): CompanionEventInput {
  return { name: "friend_voice_sample_played", surface: "chat", characterId };
}
