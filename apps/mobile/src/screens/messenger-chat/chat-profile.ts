// 대화방 안 상대 프로필 시트(ADR-0178 개정 ⟨대화방⟩) — 결선이 카탈로그 인물 · 목소리 견본 주소 · 로마자 스위치를 내려줍니다.
// 없으면(테스트 · 옛 결선) 시트는 이름 · 얼굴만 섭니다. 순수.

import { createContext } from "@lynx-js/react";

import type { ChatCounterpart } from "./chat-source.contract";
import type { FriendProfile } from "./friend-catalog.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { modelOfMetFriend } from "./suggested-friends-ui";

export type ChatProfilePort = {
  /** 카탈로그의 그 인물 — 없으면 null. */
  readonly profileOf: (characterId: string) => FriendProfile | null;
  /** 목소리 견본 경로 → 재생 주소(ADR-0198). 없거나 못 풀면 null. */
  readonly voiceSampleUrl?: (path: string) => string | null;
  /** 로마자 스위치(ADR-0188). 없으면 끔. */
  readonly romanization?: () => boolean;
};

export const chatProfileTestIds = { avatar: "messenger-chat-profile-avatar" } as const;

export const ChatProfileContext = createContext<ChatProfilePort | null>(null);

/** 방 상대의 시트 모델 — 이미 친구(`added`), 제안 없음. 이름 · 얼굴은 방의 것. */
export function chatProfileModelOf(
  port: ChatProfilePort | null,
  counterpart: ChatCounterpart,
): SuggestedFriendSheetModel {
  return modelOfMetFriend(port?.profileOf(counterpart.id) ?? null, counterpart);
}
