// 친구 찾기 화면(R5)의 칩 · 섹션 판정입니다(ADR-0162). 순수.

import type { ChatRoomSummary } from "./chat-source.contract";
import type { EarlyAccessOffer, FriendCatalog, FriendProfile } from "./friend-catalog.contract";
import { friendStatusOf, offerOf, roomOfFriend } from "./suggested-friends";
import type { SuggestInput } from "./suggested-friends";

/** 칩 — 전체 · 이야기 인물 · 일반 인물 카테고리. */
export type DirectoryFilter =
  | { readonly kind: "all" }
  | { readonly kind: "story" }
  | { readonly kind: "category"; readonly id: string };

/** 줄 오른쪽 동작 — Chat · 엽전 먼저 만나기 · 잠김(제안 꺼짐) · 이미 추가함. */
export type DirectoryAction = "chat" | "early" | "locked" | "added";

export type DirectoryRow = {
  readonly character: FriendProfile;
  readonly room: ChatRoomSummary;
  readonly action: DirectoryAction;
  readonly offer: EarlyAccessOffer | null;
};

export type Directory = {
  readonly story: readonly DirectoryRow[];
  readonly general: readonly DirectoryRow[];
};

export const filterKeyOf = (filter: DirectoryFilter): string =>
  filter.kind === "category" ? `category-${filter.id}` : filter.kind;

/** All · (이야기 인물이 있으면) From your story · 일반 인물이 쓰는 카테고리(카탈로그의 카테고리 순서). */
export function directoryChipsOf(catalog: FriendCatalog): readonly DirectoryFilter[] {
  const { characters } = catalog;
  const used = new Set(characters.filter((c) => c.kind === "general").map((c) => c.category ?? ""));
  return [
    { kind: "all" },
    ...(characters.some((c) => c.kind === "story") ? [{ kind: "story" } as const] : []),
    ...catalog.categories
      .filter((category) => used.has(category.id))
      .map((category) => ({ kind: "category", id: category.id }) as const),
  ];
}

const ORDER: Readonly<Record<DirectoryAction, number>> = { chat: 0, early: 1, locked: 2, added: 3 };

function rowOf(character: FriendProfile, input: SuggestInput): DirectoryRow | null {
  const room = roomOfFriend(input.rooms, character.id);
  if (room === undefined) return null;
  const status = friendStatusOf(character, room, input.metEpisode);
  if (status === "added") return { character, room, action: "added", offer: null };
  if (status === "addable") return { character, room, action: "chat", offer: null };
  const offer = offerOf(character, input.earlyAccess, input.now);
  return { character, room, action: offer === null ? "locked" : "early", offer };
}

function sectionOf(characters: readonly FriendProfile[], input: SuggestInput): DirectoryRow[] {
  const rows: DirectoryRow[] = [];
  for (const character of characters) {
    const row = rowOf(character, input);
    if (row !== null) rows.push(row);
  }
  // 안정 정렬 — 같은 동작은 카탈로그 순서.
  return rows.sort((a, b) => ORDER[a.action] - ORDER[b.action]);
}

/** 두 섹션 — FROM YOUR STORY(이야기 인물) · NEW FRIENDS(일반 인물). 방이 없는 인물은 서지 않습니다. */
export function directoryOf(input: SuggestInput & { readonly filter: DirectoryFilter }): Directory {
  const { filter } = input;
  const all = input.catalog.characters;
  const story = filter.kind === "category" ? [] : all.filter((c) => c.kind === "story");
  const general =
    filter.kind === "story"
      ? []
      : all.filter(
          (c) => c.kind === "general" && (filter.kind === "all" || c.category === filter.id),
        );
  return { story: sectionOf(story, input), general: sectionOf(general, input) };
}
