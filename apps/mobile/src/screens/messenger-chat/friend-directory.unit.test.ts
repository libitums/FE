import { describe, expect, test } from "vitest";

import { directoryChipsOf, directoryOf, filterKeyOf } from "./friend-directory";
import type { DirectoryRow } from "./friend-directory";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(FD-U1 ~ FD-U3): 친구 찾기(R5)의 칩 · 섹션 판정(ADR-0162).

const NOW = 1_800_000_000_000;
const rowsOf = (rows: readonly DirectoryRow[]) => rows.map((r) => [r.character.id, r.action]);

const catalog = catalogOf(
  [
    friend("duksu", { unlockEpisodeId: null, unlockEpisode: null }),
    friend("jaemin", { earlyAccess: { price: 100, endsAt: null } }),
    friend("mina"),
    friend("doyun"),
    general("cook", { category: "food" }),
    general("singer", { category: "music" }),
    general("baker", { category: "food" }),
  ],
  [
    { id: "music", label: { en: "Music" } },
    { id: "food", label: { en: "Food" } },
    { id: "travel", label: { en: "Travel" } },
  ],
);
const rooms = [
  room("duksu", true),
  room("jaemin", false),
  room("mina", false),
  room("doyun", false),
  room("cook", false),
  room("singer", true),
  room("baker", false),
];
const input = { catalog, rooms, now: NOW, metEpisode: (id: string) => id === "udoyun" };

test("FD-U1 칩은 All · From your story · 일반 인물이 쓰는 카테고리(카탈로그 순서)", () => {
  expect(directoryChipsOf(catalog).map(filterKeyOf)).toEqual([
    "all",
    "story",
    "category-music",
    "category-food",
  ]);
  expect(directoryChipsOf(catalogOf([general("g")])).map(filterKeyOf)).toEqual(["all"]);
});

describe("FD-U2 섹션 · 동작", () => {
  test("이야기: Chat → 먼저 만나기 → 잠김 → Added, 일반: Chat → Added", () => {
    const directory = directoryOf({ ...input, earlyAccess: true, filter: { kind: "all" } });
    expect(rowsOf(directory.story)).toEqual([
      ["doyun", "chat"],
      ["jaemin", "early"],
      ["mina", "locked"],
      ["duksu", "added"],
    ]);
    expect(rowsOf(directory.general)).toEqual([
      ["cook", "chat"],
      ["baker", "chat"],
      ["singer", "added"],
    ]);
    expect(directory.story[1]?.offer).toEqual({ price: 100, endsAt: null });
  });

  test("먼저 만나기가 꺼지면 제안 인물도 잠김이다", () => {
    const directory = directoryOf({ ...input, earlyAccess: false, filter: { kind: "all" } });
    expect(directory.story.find((r) => r.character.id === "jaemin")?.action).toBe("locked");
  });
});

test("FD-U3 필터 — story는 일반을 비우고, 카테고리는 이야기를 비우고 그 카테고리만", () => {
  const story = directoryOf({ ...input, earlyAccess: false, filter: { kind: "story" } });
  expect(story.general).toEqual([]);
  expect(story.story).toHaveLength(4);
  const food = directoryOf({
    ...input,
    earlyAccess: false,
    filter: { kind: "category", id: "food" },
  });
  expect(food.story).toEqual([]);
  expect(rowsOf(food.general)).toEqual([
    ["cook", "chat"],
    ["baker", "chat"],
  ]);
});
