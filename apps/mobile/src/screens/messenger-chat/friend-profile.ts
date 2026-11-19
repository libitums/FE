// 프로필 시트 추가분의 순수 판정입니다(ADR-0164 앱 추가 2026-11-20) — 목소리 견본 주소 · 대화방 머리에서 여는 읽기 전용 모델 ·
// 제품 이벤트. 시트 · 줄 · 친구 찾기의 판정은 그대로 `suggested-friends.ts`가 집니다.

import type { CompanionEventInput } from "../../lib/companion-event.contract";
import type { ChatCounterpart, ChatRoomAccess } from "./chat-source.contract";
import type { FriendCatalog, FriendProfile } from "./friend-catalog.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";

type MediaUrlOf = ((path: string) => string | null) | undefined;

/** 견본 주소 — 경로가 없거나(이야기 다섯) 해석기가 없거나 주소를 못 만들면 null(단추가 서지 않습니다). */
export function voiceUrlOf(character: FriendProfile, mediaUrlOf: MediaUrlOf): string | null {
  const path = character.voiceSamplePath ?? null;
  if (path === null || mediaUrlOf === undefined) return null;
  return mediaUrlOf(path);
}

/** 줄 · 친구 찾기에서 연 시트 모델에 견본 주소를 얹습니다 — 잠긴 인물은 얹지 않습니다(새 노출 없음). */
export function withVoiceUrl(
  model: SuggestedFriendSheetModel,
  mediaUrlOf: MediaUrlOf,
): SuggestedFriendSheetModel {
  const voiceUrl = model.status === "locked" ? null : voiceUrlOf(model.character, mediaUrlOf);
  return { ...model, voiceUrl };
}

export type RoomProfileInput = {
  readonly catalog: FriendCatalog;
  readonly counterpart: ChatCounterpart;
  /** 대화 스냅숏의 그 방 접근 — 방이 없으면 null. */
  readonly access: ChatRoomAccess | null;
  readonly mediaUrlOf?: (path: string) => string | null;
};

/**
 * 대화방 머리에서 여는 읽기 전용 프로필 — **열린 방**이고 카탈로그에 그 인물이 있을 때만(아홉 모두). 그 밖(잠긴 방 · 없는 방 · 모르는
 * 인물)은 null이라 머리 이름을 누를 수 없습니다. 시트는 이미 친구인 인물을 그리므로 제안이 없습니다.
 */
export function roomProfileModelOf(input: RoomProfileInput): SuggestedFriendSheetModel | null {
  if (input.access?.kind !== "open") return null;
  const character = input.catalog.characters.find(
    (candidate) => candidate.id === input.counterpart.id,
  );
  if (character === undefined) return null;
  return {
    character,
    avatarUrl: input.counterpart.avatarUrl,
    status: "addable",
    offer: null,
    voiceUrl: voiceUrlOf(character, input.mediaUrlOf),
  };
}

/** 대화방 머리에서 시트를 연 순간 — 줄 · 친구 찾기와 같은 이벤트에 `from: room`. */
export function roomProfileOpenedEvent(character: FriendProfile): CompanionEventInput {
  return {
    name: "suggested_friend_opened",
    surface: "chat",
    characterId: character.id,
    kind: character.kind,
    from: "room",
  };
}

/** 견본이 새로 틀어졌음 — 훅이 `startedPlayback`일 때만 부릅니다(이어 듣기 · 멈춤 · 실패는 세지 않음). */
export function voicePlayedEvent(characterId: string): CompanionEventInput {
  return { name: "friend_voice_sample_played", surface: "chat", characterId };
}
