// 새 친구(인물 해금) 결선입니다(messenger-chat-1-5 spec §7.1). 해금 확정과 시트 모델만 다룹니다 — 순수 판정은
// `screens/messenger-chat/new-friend.ts`, 저장·출처 싱글턴은 `messenger-chat-wiring.ts`가 쥡니다.

import { CHARACTER_UNLOCKS, characterUnlockFor } from "../screens/messenger-chat/new-friend";
import type { NewFriendModel } from "../screens/messenger-chat/new-friend.contract";
import { currentMessengerChatSource, messengerUnlockStore } from "./messenger-chat-wiring";
import type { ScreenWiring } from "./screen-wiring";

/**
 * 최종 테스트를 통과한 순간 부릅니다. 이 에피소드가 새 인물을 해금하면 기록(영속)과 대화 출처에 **바로** 알리고 그 id를
 * 돌려줍니다 — 결과 화면을 시트가 뜨기 전에 떠나도 목록에 NEW 줄이 남고, 다시 끝내도 시트는 다시 안 뜹니다.
 * 해금할 인물이 없거나 이미 열었으면 null.
 */
export function commitNewFriend(episodeId: string): string | null {
  const store = messengerUnlockStore();
  const entry = characterUnlockFor({ episodeId, unlocked: store.read() });
  if (entry === null) return null;
  store.add(entry.characterId);
  currentMessengerChatSource()?.unlockCharacter(entry.characterId);
  return entry.characterId;
}

type ModelWiring = Pick<ScreenWiring, "messengerChat" | "catalogSections" | "episodeContent">;

/** 시트 모델입니다. 이름 · 얼굴 · 첫 메시지 · 회차 · 제목 중 하나라도 없으면 null(시트 없음 — 해금은 이미 됨). */
export function newFriendModelOf(characterId: string, wiring: ModelWiring): NewFriendModel | null {
  const entry = CHARACTER_UNLOCKS.find((candidate) => candidate.characterId === characterId);
  if (entry === undefined) return null;
  const thread = wiring.messengerChat.source.thread(entry.roomId);
  const opening = thread?.messages.find(
    (message) => message.kind === "text" && message.from === "them",
  );
  const section = wiring.catalogSections.find(
    (candidate) => candidate.kind === "catalog-ready" && candidate.episodeId === entry.episodeId,
  );
  if (
    thread === null ||
    opening === undefined ||
    opening.kind !== "text" ||
    section === undefined ||
    section.kind !== "catalog-ready"
  ) {
    return null;
  }
  // 그림은 부를 때의 최신 해석기로 풉니다 — 첫 렌더에서 콘텐츠가 아직 안 읽힌 해석기를 쥐지 않습니다.
  const imageUrlOf = wiring.episodeContent.imageUrlOf;
  return {
    characterId,
    roomId: entry.roomId,
    name: thread.counterpart.name,
    faceUrl: thread.counterpart.avatarUrl ?? imageUrlOf(entry.faceImagePath),
    sceneUrl: imageUrlOf(entry.sceneImagePath),
    episodeOrdinal: section.ordinal,
    episodeTitle: section.titleEn ?? section.title,
    opening: opening.text,
  };
}
