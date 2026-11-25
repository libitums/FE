import { describe, expect, test } from "vitest";

import { storyRowOf } from "./friend-stories";
import type { FriendStory } from "./friend-stories.contract";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { byLatestStory, storyOrderOf, type StoryOrderEntry } from "./story-order";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(FS-U15): 스토리 줄 · 보기의 인물 순서(ADR-0178 D3 개정 ⟨2026-11-25⟩) — 스토리가 있는 인물을 최신 순으로 한 줄에.

const NOW = STORY_NOW;

function rowOf(stories: readonly FriendStory[], seen: readonly string[] = []) {
  const catalog = catalogOf([friend("a"), friend("b"), friend("c"), general("g"), general("h")]);
  const rooms = [
    room("a", true),
    room("b", true),
    room("c", true),
    room("g", false),
    room("h", false),
  ];
  const suggested = suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW });
  return storyRowOf({ stories, rooms, suggested, seen: new Set(seen), now: NOW });
}

const ids = (order: readonly StoryOrderEntry[]) =>
  order.map((each) => `${each.kind}:${each.entry.story.characterId}`);

describe("FS-U15 스토리 인물 순서", () => {
  test("친구 · 안 만난 친구를 한 줄로, 최신 스토리 순", () => {
    const row = rowOf([
      story("a", { postedAt: NOW - 5 * HOUR_MS }),
      story("b", { postedAt: NOW - 1 * HOUR_MS }),
      story("c", { postedAt: NOW - 3 * HOUR_MS }),
      story("g", { postedAt: NOW - 2 * HOUR_MS }),
    ]);
    expect(ids(storyOrderOf(row))).toEqual(["friend:b", "unmet:g", "friend:c", "friend:a"]);
  });

  test("본 것은 순서에 쓰지 않는다", () => {
    const stories = [
      story("a", { postedAt: NOW - 1 * HOUR_MS }),
      story("b", { postedAt: NOW - 2 * HOUR_MS }),
    ];
    expect(ids(storyOrderOf(rowOf(stories, ["s-a"])))).toEqual(["friend:a", "friend:b"]);
    expect(ids(storyOrderOf(rowOf(stories)))).toEqual(["friend:a", "friend:b"]);
  });

  test("같은 시각이면 인물 id 순 — 입력 · 방 순서와 무관", () => {
    const row = rowOf([story("g"), story("c"), story("b"), story("a")]);
    expect(ids(storyOrderOf(row))).toEqual(["friend:a", "friend:b", "friend:c", "unmet:g"]);
  });

  test("한 인물에 둘이면 그 인물의 최신 스토리로 선다", () => {
    const row = rowOf([
      story("a", { id: "a-old", postedAt: NOW - 20 * HOUR_MS }),
      story("a", { id: "a-new", postedAt: NOW - 1 * HOUR_MS }),
      story("b", { postedAt: NOW - 3 * HOUR_MS }),
    ]);
    expect(storyOrderOf(row).map((each) => each.entry.story.id)).toEqual(["a-new", "s-b"]);
  });

  test("스토리 없는 추천은 순서에 없고, 줄은 바뀌지 않는다", () => {
    const row = rowOf([story("a", { postedAt: NOW - 3 * HOUR_MS }), story("b")]);
    const before = row.friends.map((entry) => entry.story.characterId);
    expect(ids(storyOrderOf(row))).toEqual(["friend:b", "friend:a"]);
    expect(row.friends.map((entry) => entry.story.characterId)).toEqual(before);
    expect(row.others.map((each) => each.character.id)).toEqual(["g", "h"]);
  });

  test("비교 함수: 늦은 것이 앞, 같으면 인물 id", () => {
    const late = { story: story("z", { postedAt: NOW }) };
    const early = { story: story("a", { postedAt: NOW - 1 }) };
    expect(byLatestStory(late, early)).toBeLessThan(0);
    expect(byLatestStory(early, late)).toBeGreaterThan(0);
    expect(byLatestStory({ story: story("a") }, { story: story("b") })).toBeLessThan(0);
    expect(byLatestStory({ story: story("b") }, { story: story("a") })).toBeGreaterThan(0);
    expect(byLatestStory({ story: story("a") }, { story: story("a") })).toBe(0);
  });
});
