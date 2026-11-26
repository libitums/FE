import { expect, test } from "vitest";

import type { ChatRoomSummary } from "./chat-source.contract";
import type { ChatStoryLookup } from "./chat-story-thumb.contract";
import { chatFriendItemsOf, chatStoryTargetOf, chatStoryThumbOf } from "./chat-story-thumb";
import type { ChatStoryQuote } from "./friend-stories.contract";
import { HOUR_MS, story, STORY_NOW } from "./friend-stories.test-support";
import { myStory } from "./my-stories.test-support";

// `unit` 계층(CT-U1 ~ U8): 대화방 스토리 인용 판(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩) — 판 모양 · 누름 · 친구 보기 장.

const NOW = STORY_NOW;
const EMPTY: ChatStoryLookup = { mine: null, friends: null, deleted: new Set() };

const mineQuote: ChatStoryQuote = {
  storyId: "ms-1",
  characterId: "mina",
  line: "서울에 도착했어!",
  imagePath: null,
  postedAt: NOW - HOUR_MS,
  kind: "mine",
};
const friendQuote: ChatStoryQuote = {
  storyId: "s-mina",
  characterId: "mina",
  line: "야근 끝! 편의점 라면이 최고야",
  imagePath: "content/images/mina.webp",
  postedAt: NOW - 2 * HOUR_MS,
};

test("CT-U1 지운 스토리(서버 kind deleted · 이 방에서 막 지움)는 deleted", () => {
  expect(chatStoryThumbOf({ ...mineQuote, kind: "deleted" }, EMPTY, NOW)).toEqual({
    kind: "deleted",
  });
  const lookup = { ...EMPTY, deleted: new Set(["ms-1"]) };
  expect(chatStoryThumbOf(mineQuote, lookup, NOW)).toEqual({ kind: "deleted" });
  expect(chatStoryTargetOf(mineQuote, lookup, NOW)).toBeNull();
});

test("CT-U2 내 스토리가 목록에 있으면 그 스토리 그대로(지난 것도 — 보관함), 열 수 있음", () => {
  const posted = myStory("ms-1", {
    kind: "photo",
    imagePath: "u/p.jpg",
    postedAt: NOW - 30 * HOUR_MS,
  });
  const lookup = { ...EMPTY, mine: [myStory("ms-0"), posted] };
  expect(chatStoryThumbOf(mineQuote, lookup, NOW)).toEqual({
    kind: "mine",
    story: posted,
    openable: true,
  });
  expect(chatStoryTargetOf(mineQuote, lookup, NOW)).toEqual({ kind: "mine", story: posted });
});

test("CT-U3 내 스토리가 목록에 없으면(아직 모름 · 오래됨) 바탕색 + 한 줄로 대신, 누름 없음", () => {
  for (const lookup of [EMPTY, { ...EMPTY, mine: [myStory("other")] }]) {
    const view = chatStoryThumbOf(mineQuote, lookup, NOW);
    expect(view.kind).toBe("mine");
    if (view.kind !== "mine") return;
    expect(view.openable).toBe(false);
    expect(view.story).toMatchObject({
      id: "ms-1",
      kind: "text",
      ko: "서울에 도착했어!",
      meaning: "",
      imagePath: null,
      background: "orange",
      overlays: [],
    });
    expect(chatStoryTargetOf(mineQuote, lookup, NOW)).toBeNull();
  }
});

test("CT-U4 친구 스토리 — 그림 경로 그대로, 24시간 안이면 ended 아님 · 목록에 있으면 그 인물 보기로", () => {
  const lookup = { ...EMPTY, friends: [story("mina")] };
  expect(chatStoryThumbOf(friendQuote, lookup, NOW)).toEqual({
    kind: "friend",
    imagePath: "content/images/mina.webp",
    ended: false,
  });
  expect(chatStoryTargetOf(friendQuote, lookup, NOW)).toEqual({
    kind: "friend",
    characterId: "mina",
    storyId: "s-mina",
  });
});

test("CT-U5 친구 스토리가 24시간 지났으면 ended · 누르면 안내 시트", () => {
  const old = { ...friendQuote, postedAt: NOW - 25 * HOUR_MS };
  expect(chatStoryThumbOf(old, EMPTY, NOW)).toMatchObject({ kind: "friend", ended: true });
  expect(chatStoryTargetOf(old, EMPTY, NOW)).toEqual({ kind: "ended" });
  // 목록을 받았는데 그 스토리가 없으면(시각을 몰라도) 지난 것.
  const unknownTime = { ...friendQuote, postedAt: null };
  const loaded = { ...EMPTY, friends: [story("yoonkyung")] };
  expect(chatStoryThumbOf(unknownTime, loaded, NOW)).toMatchObject({ ended: true });
  expect(chatStoryTargetOf(unknownTime, loaded, NOW)).toEqual({ kind: "ended" });
  // 목록의 만료가 지났어도 지난 것.
  const expired = { ...EMPTY, friends: [story("mina", { expiresAt: NOW - 1 })] };
  expect(chatStoryTargetOf(friendQuote, expired, NOW)).toEqual({ kind: "ended" });
});

test("CT-U6 친구 스토리 — 목록을 아직 못 받았고 24시간 안이면 판은 그대로, 누름은 아무것도 열지 않음", () => {
  expect(chatStoryThumbOf(friendQuote, EMPTY, NOW)).toMatchObject({ ended: false });
  expect(chatStoryTargetOf(friendQuote, EMPTY, NOW)).toBeNull();
});

const room = {
  roomId: "room-mina",
  counterpart: { id: "mina", name: "미나", avatarUrl: "https://a/mina.png" },
} as unknown as ChatRoomSummary;

test("CT-U7 친구 보기 장 — 그 인물의 살아 있는 스토리만 올린 순, 시작은 그 스토리, 이름 · 얼굴은 방", () => {
  const first = story("mina", { id: "s-1", postedAt: NOW - 3 * HOUR_MS });
  const second = story("mina", { id: "s-2", postedAt: NOW - HOUR_MS });
  const gone = story("mina", { id: "s-0", expiresAt: NOW - 1 });
  const other = story("yoonkyung");
  const opened = chatFriendItemsOf(
    [second, other, gone, first],
    { characterId: "mina", storyId: "s-2" },
    room,
    (path) => `https://cdn/${path}`,
    NOW,
  );
  expect(opened?.items.map((item) => item.story.id)).toEqual(["s-1", "s-2"]);
  expect(opened?.start).toBe(1);
  expect(opened?.items[0]).toMatchObject({
    name: "미나",
    avatarUrl: "https://a/mina.png",
    imageUrl: "https://cdn/content/images/mina.webp",
    unmet: null,
  });
});

test("CT-U8 친구 보기 장 — 그 스토리가 없거나 방이 없으면 null", () => {
  const target = { characterId: "mina", storyId: "s-9" };
  expect(chatFriendItemsOf([story("mina")], target, room, () => null, NOW)).toBeNull();
  const live = { characterId: "mina", storyId: "s-mina" };
  expect(chatFriendItemsOf([story("mina")], live, null, () => null, NOW)).toBeNull();
});
