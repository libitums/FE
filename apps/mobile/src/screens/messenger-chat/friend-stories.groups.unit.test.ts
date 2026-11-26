import { describe, expect, test } from "vitest";

import { storyRowOf, viewerGroupOf, viewerItemsOf, viewerJump } from "./friend-stories";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(FS-U21 ~ U24): 인물 기준 묶음(ADR-0178 D4 개정) — 한 인물의 여러 스토리를 올린 시각 순으로 모으고, 보기는 인물 묶음 단위로
// 진행 막대 · 가로 넘김을 셉니다.

const NOW = STORY_NOW;
const url = (path: string) => `https://cdn/${path}`;

function input(stories: ReturnType<typeof story>[], seen: readonly string[] = []) {
  const catalog = catalogOf([friend("a"), friend("b"), general("g")]);
  const rooms = [room("a", true), room("b", true), room("g", false)];
  const suggested = suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW });
  return { stories, rooms, suggested, seen: new Set(seen), now: NOW };
}

const a1 = story("a", { id: "a1", postedAt: NOW - 5 * HOUR_MS });
const a2 = story("a", { id: "a2", postedAt: NOW - 3 * HOUR_MS });
const a3 = story("a", { id: "a3", postedAt: NOW - 1 * HOUR_MS });
const b1 = story("b", { id: "b1", postedAt: NOW - 2 * HOUR_MS });
const g1 = story("g", { id: "g1", postedAt: NOW - 4 * HOUR_MS });
const g2 = story("g", { id: "g2", postedAt: NOW - 2 * HOUR_MS });

describe("FS-U21 인물마다 스토리를 모은다", () => {
  test("올린 시각 순으로 모으고, 줄 칸은 가장 새 것 · 안 만난 친구도 같다", () => {
    const row = storyRowOf(input([a3, b1, a1, a2, g2, g1]));
    const a = row.friends.find((entry) => entry.story.characterId === "a");
    expect(a?.story.id).toBe("a3");
    expect(a?.stories.map((each) => each.id)).toEqual(["a1", "a2", "a3"]);
    expect(row.unmet[0]?.stories.map((each) => each.id)).toEqual(["g1", "g2"]);
  });

  test("본 것은 그 인물의 스토리를 다 봤을 때만", () => {
    const some = storyRowOf(input([a1, a2, b1], ["a1"]));
    expect(some.friends.find((e) => e.story.characterId === "a")?.seen).toBe(false);
    const all = storyRowOf(input([a1, a2, b1], ["a1", "a2"]));
    expect(all.friends.find((e) => e.story.characterId === "a")?.seen).toBe(true);
  });

  test("만료된 스토리는 묶음에서 빠진다", () => {
    const expired = story("a", { id: "a0", expiresAt: NOW - 1 });
    const row = storyRowOf(input([expired, a2]));
    expect(row.friends[0]?.stories.map((each) => each.id)).toEqual(["a2"]);
  });
});

describe("FS-U22 보기의 장 목록 — 인물 묶음을 이어 붙이고, 그 인물의 안 본 첫 장부터", () => {
  const seen = new Set(["a1"]);
  const row = storyRowOf(input([a1, a2, a3, b1, g1, g2], [...seen]));

  test("줄의 친구 → 친구 묶음을 차례로 · 그 인물의 안 본 첫 장에서 시작", () => {
    // 줄 순서: 안 본 a(가장 새 a3 1h) · b(2h) · g(안 만난, g2 2h — id 순 b 뒤)
    const opened = viewerItemsOf(row, { from: "friend", characterId: "a" }, url, seen);
    expect(opened?.items.map((item) => item.story.id)).toEqual([
      "a1",
      "a2",
      "a3",
      "b1",
      "g1",
      "g2",
    ]);
    expect(opened?.start).toBe(1);
    const fromB = viewerItemsOf(row, { from: "friend", characterId: "b" }, url, seen);
    expect(fromB?.start).toBe(3);
  });

  test("이어 보기는 첫 인물의 안 본 첫 장부터, 다 봤으면 그 인물의 처음", () => {
    expect(viewerItemsOf(row, { from: "watch_all" }, url, seen)?.start).toBe(1);
    const all = new Set(["a1", "a2"]);
    const seenAll = storyRowOf(input([a1, a2], [...all]));
    expect(viewerItemsOf(seenAll, { from: "watch_all" }, url, all)?.start).toBe(0);
  });

  test("알림은 그 인물 묶음 하나, 안 만난 친구 칸은 줄 전체 중 그 묶음부터", () => {
    expect(
      viewerItemsOf(row, { from: "push", characterId: "a" }, url)?.items.map((i) => i.story.id),
    ).toEqual(["a1", "a2", "a3"]);
    const unmet = viewerItemsOf(row, { from: "unmet", characterId: "g" }, url);
    expect(unmet?.items.map((i) => i.story.id)).toEqual(["a1", "a2", "a3", "b1", "g1", "g2"]);
    expect(unmet?.items.slice(4).every((i) => i.unmet?.character.id === "g")).toBe(true);
    expect(unmet?.start).toBe(4);
  });
});

describe("FS-U23 viewerGroupOf — 지금 장의 인물 묶음", () => {
  const items =
    viewerItemsOf(storyRowOf(input([a1, a2, a3, b1])), { from: "watch_all" }, url)?.items ?? [];

  test("묶음의 시작 · 칸 수 · 그 안의 자리", () => {
    expect(viewerGroupOf(items, 0)).toEqual({ start: 0, count: 3, at: 0 });
    expect(viewerGroupOf(items, 2)).toEqual({ start: 0, count: 3, at: 2 });
    expect(viewerGroupOf(items, 3)).toEqual({ start: 3, count: 1, at: 0 });
  });
});

describe("FS-U24 viewerJump — 가로 넘김은 인물 단위", () => {
  const items =
    viewerItemsOf(storyRowOf(input([a1, a2, a3, b1])), { from: "watch_all" }, url)?.items ?? [];

  test("다음 → 다음 인물의 첫 장, 마지막 인물이면 닫힘", () => {
    expect(viewerJump(items, 1, "next")).toBe(3);
    expect(viewerJump(items, 3, "next")).toBe("close");
  });

  test("이전 → 이전 인물의 첫 장, 첫 인물이면 그 인물의 처음", () => {
    expect(viewerJump(items, 3, "prev")).toBe(0);
    expect(viewerJump(items, 2, "prev")).toBe(0);
  });
});
