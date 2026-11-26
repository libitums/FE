import { describe, expect, test } from "vitest";

import {
  liveStoriesOf,
  seenRecordsWith,
  storyAgeOf,
  storyRowOf,
  viewerItemsOf,
  viewerStep,
} from "./friend-stories";
import { storyOrderOf } from "./story-order";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(FS-U1 ~ U7 · U10): 친구 스토리 판정(ADR-0178 D2 · D3 · D4). 인물 순서는 FS-U17(`story-order.unit.test.ts`).

const NOW = STORY_NOW;
const MIN = 60_000;
const url = (path: string) => `https://cdn/${path}`;

function input(patch: Partial<Parameters<typeof storyRowOf>[0]> = {}) {
  const catalog = catalogOf([friend("a"), friend("b"), friend("c"), general("g"), general("h")]);
  const rooms = [
    room("a", true),
    room("b", true),
    room("c", true),
    room("g", false),
    room("h", false),
  ];
  const suggested = suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW });
  return {
    stories: [story("a"), story("b"), story("c"), story("g")],
    rooms,
    suggested,
    seen: new Set<string>(),
    now: NOW,
    ...patch,
  };
}

describe("FS-U1 살아 있는 스토리", () => {
  test("만료 시각이 지금이거나 지났으면 뺀다", () => {
    const list = [
      story("a", { expiresAt: NOW + 1 }),
      story("b", { expiresAt: NOW }),
      story("c", { expiresAt: NOW - 1 }),
    ];
    expect(liveStoriesOf(list, NOW).map((s) => s.characterId)).toEqual(["a"]);
  });
});

describe("FS-U2 스토리 줄", () => {
  test("열린 방 인물 → 친구, 추천 대상 → 안 만난 친구, 스토리 없는 추천 → 그 밖", () => {
    const row = storyRowOf(input());
    expect(row.friends.map((e) => e.story.characterId)).toEqual(["a", "b", "c"]);
    expect(row.unmet.map((e) => e.story.characterId)).toEqual(["g"]);
    expect(row.others.map((f) => f.character.id)).toEqual(["h"]);
  });

  test("본 것과 상관없이 최근 순(D3 개정) — 본 것은 표시만", () => {
    const row = storyRowOf(
      input({
        stories: [
          story("a", { postedAt: NOW - 5 * HOUR_MS }),
          story("b", { postedAt: NOW - 1 * HOUR_MS }),
          story("c", { postedAt: NOW - 3 * HOUR_MS }),
        ],
        seen: new Set(["s-b"]),
      }),
    );
    expect(row.friends.map((e) => [e.story.characterId, e.seen])).toEqual([
      ["b", true],
      ["c", false],
      ["a", false],
    ]);
  });

  test("안 만난 친구도 추천 순서가 아니라 최근 순", () => {
    const catalog = catalogOf([general("g"), general("h")]);
    const rooms = [room("g", false), room("h", false)];
    const row = storyRowOf({
      stories: [
        story("g", { postedAt: NOW - 3 * HOUR_MS }),
        story("h", { postedAt: NOW - HOUR_MS }),
      ],
      rooms,
      suggested: suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW }),
      seen: new Set(),
      now: NOW,
    });
    expect(row.unmet.map((e) => e.story.characterId)).toEqual(["h", "g"]);
  });

  test("방이 없는 인물 · 만료된 스토리는 줄에 없다", () => {
    const row = storyRowOf(
      input({ stories: [story("zz"), story("a", { expiresAt: NOW - 1 }), story("b")] }),
    );
    expect(row.friends.map((e) => e.story.characterId)).toEqual(["b"]);
  });

  test("추천 대상이 아닌 잠긴 방(숨긴 친구)의 스토리는 없다", () => {
    const base = input();
    const row = storyRowOf({
      ...base,
      suggested: base.suggested.filter((f) => f.character.id !== "g"),
    });
    expect(row.unmet).toEqual([]);
  });
});

describe("FS-U3 한 인물에 둘이면 줄 칸은 최신 것(묶음은 FS-U21)", () => {
  test("올린 시각이 늦은 것이 줄 칸, 둘 다 묶음에", () => {
    const row = storyRowOf(
      input({
        stories: [
          story("a", { id: "old", postedAt: NOW - 20 * HOUR_MS }),
          story("a", { id: "new", postedAt: NOW - 1 * HOUR_MS }),
        ],
      }),
    );
    expect(row.friends.map((e) => e.story.id)).toEqual(["new"]);
    expect(row.friends[0]?.stories.map((e) => e.id)).toEqual(["old", "new"]);
  });
});

describe("FS-U4 경과 시간", () => {
  test.each([
    [59_000, { unit: "now" }],
    [MIN, { unit: "m", value: 1 }],
    [59 * MIN + 59_000, { unit: "m", value: 59 }],
    [HOUR_MS, { unit: "h", value: 1 }],
    [23 * HOUR_MS + 59 * MIN, { unit: "h", value: 23 }],
    [-5_000, { unit: "now" }],
  ])("%d ms → %o", (ago, expected) => {
    expect(storyAgeOf(NOW - ago, NOW)).toEqual(expected);
  });
});

describe("FS-U6 보기 칸 이동", () => {
  test("다음 · 저절로 넘김은 한 칸, 마지막이면 닫힘", () => {
    expect(viewerStep({ index: 0, count: 2 }, "next")).toEqual({ index: 1, count: 2 });
    expect(viewerStep({ index: 0, count: 2 }, "tick")).toEqual({ index: 1, count: 2 });
    expect(viewerStep({ index: 1, count: 2 }, "next")).toBe("close");
    expect(viewerStep({ index: 1, count: 2 }, "tick")).toBe("close");
  });

  test("이전은 한 칸, 처음이면 그대로", () => {
    expect(viewerStep({ index: 1, count: 2 }, "prev")).toEqual({ index: 0, count: 2 });
    expect(viewerStep({ index: 0, count: 2 }, "prev")).toEqual({ index: 0, count: 2 });
  });
});

describe("FS-U7 본 것 표시", () => {
  test("새 표시를 더하고 만료가 지난 표시는 지운다", () => {
    const records = { old: NOW - 1, live: NOW + HOUR_MS };
    expect(seenRecordsWith(records, "new", NOW + 2 * HOUR_MS, NOW)).toEqual({
      live: NOW + HOUR_MS,
      new: NOW + 2 * HOUR_MS,
    });
  });

  test("같은 id는 만료 시각을 덮어쓴다", () => {
    expect(seenRecordsWith({ a: NOW + 1 }, "a", NOW + 9, NOW)).toEqual({ a: NOW + 9 });
  });
});

describe("FS-U10 보기의 장 목록", () => {
  const row = storyRowOf(input({ seen: new Set(["s-a"]) }));

  test("줄의 친구를 누르면 줄 전체(안 만난 친구 포함) 중 그 칸부터", () => {
    // 같은 시각 — 인물 id 순 a · b · c · g(본 a도 제자리, D3 개정 · ⟨잠긴 인물⟩)
    const opened = viewerItemsOf(row, { from: "friend", characterId: "c" }, url);
    expect(opened?.items.map((i) => i.story.characterId)).toEqual(["a", "b", "c", "g"]);
    expect(opened?.start).toBe(2);
    expect(opened?.items[1]).toMatchObject({
      name: "b",
      avatarUrl: "https://img/b.webp",
      imageUrl: "https://cdn/content/images/b.webp",
      unmet: null,
    });
  });

  test("이어 보기는 줄 순서에서 친구만, 친구 열기는 줄 순서 그대로(storyOrderOf) — 안 만난 친구도 든다", () => {
    const timed = storyRowOf(
      input({
        stories: [
          story("a", { postedAt: NOW - 5 * HOUR_MS }),
          story("b", { postedAt: NOW - 1 * HOUR_MS }),
          story("c", { postedAt: NOW - 3 * HOUR_MS }),
          story("g", { postedAt: NOW - HOUR_MS / 2 }),
        ],
        seen: new Set(["s-b"]),
      }),
    );
    const rowOrder = storyOrderOf(timed)
      .filter((each) => each.kind === "friend")
      .map((each) => each.entry.story.characterId);
    expect(rowOrder).toEqual(["b", "c", "a"]);
    const all = viewerItemsOf(timed, { from: "watch_all" }, url);
    expect(all?.items.map((i) => i.story.characterId)).toEqual(rowOrder);
    const fromC = viewerItemsOf(timed, { from: "friend", characterId: "c" }, url);
    const fullOrder = storyOrderOf(timed).map((each) => each.entry.story.characterId);
    expect(fullOrder).toEqual(["g", "b", "c", "a"]);
    expect(fromC?.items.map((i) => i.story.characterId)).toEqual(fullOrder);
    expect(fromC?.start).toBe(2);
  });

  test("안 만난 친구 칸도 줄 전체 중 그 칸부터, 그 장은 추천 친구를 싣는다", () => {
    const opened = viewerItemsOf(row, { from: "unmet", characterId: "g" }, url);
    expect(opened?.items.map((i) => i.story.characterId)).toEqual(["a", "b", "c", "g"]);
    expect(opened?.items[3]?.unmet?.character.id).toBe("g");
    expect(opened?.start).toBe(3);
  });

  test("이어 보기는 친구 스토리를 처음부터, 친구 스토리가 없으면 null", () => {
    expect(viewerItemsOf(row, { from: "watch_all" }, url)?.start).toBe(0);
    const empty = storyRowOf(input({ stories: [story("g")] }));
    expect(viewerItemsOf(empty, { from: "watch_all" }, url)).toBeNull();
  });

  test("알림은 그 인물 한 장(친구 · 안 만난 친구 모두), 없으면 null", () => {
    expect(
      viewerItemsOf(row, { from: "push", characterId: "b" }, url)?.items.map((i) => i.story.id),
    ).toEqual(["s-b"]);
    expect(
      viewerItemsOf(row, { from: "push", characterId: "g" }, url)?.items.map((i) => i.story.id),
    ).toEqual(["s-g"]);
    expect(viewerItemsOf(row, { from: "push", characterId: "zz" }, url)).toBeNull();
  });
});
