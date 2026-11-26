import { describe, expect, test } from "vitest";

import { storyRowOf, viewerItemsOf, viewerJump, viewerStep } from "./friend-stories";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(FS-U35): 줄 칸을 눌러 연 보기의 다음 인물(ADR-0178 D3 개정 ⟨잠긴 인물⟩) — 안 만난(잠긴 · 추가 가능) 인물도 줄 순서대로 들어간다.
// 고치기 전에는 친구 칸만 골라, 다음 칸이 안 만난 인물이면 건너뛰거나(뒤에 친구가 없으면) 닫혔고, 안 만난 칸에서 연 보기는 그 인물에서 끝났다.

const NOW = STORY_NOW;
const url = (path: string) => `https://cdn/${path}`;

// 줄 순서(최근 순): a(친구, 1h) · g(안 만난, 2h) · b(친구, 3h) · h(안 만난, 4h)
const row = storyRowOf({
  stories: [
    story("a", { postedAt: NOW - 1 * HOUR_MS }),
    story("g", { postedAt: NOW - 2 * HOUR_MS }),
    story("b", { postedAt: NOW - 3 * HOUR_MS }),
    story("h", { postedAt: NOW - 4 * HOUR_MS }),
  ],
  rooms: [room("a", true), room("b", true), room("g", false), room("h", false)],
  suggested: suggestedFriendsOf({
    catalog: catalogOf([friend("a"), friend("b"), general("g"), general("h")]),
    rooms: [room("a", true), room("b", true), room("g", false), room("h", false)],
    earlyAccess: false,
    now: NOW,
  }),
  seen: new Set<string>(),
  now: NOW,
});
const who = (items: readonly { story: { characterId: string } }[] | undefined) =>
  items?.map((item) => item.story.characterId);

describe("FS-U35 줄 칸에서 연 보기 — 안 만난 인물도 줄 순서대로", () => {
  test("친구 칸 → 줄 전체(친구 · 안 만난 인물), 그 칸부터 — 다음 인물이 안 만난 인물이면 그 장으로", () => {
    const opened = viewerItemsOf(row, { from: "friend", characterId: "a" }, url);
    expect(who(opened?.items)).toEqual(["a", "g", "b", "h"]);
    expect(opened?.start).toBe(0);
    expect(opened?.items[1]?.unmet?.character.id).toBe("g");
    expect(opened?.items[0]?.unmet).toBeNull();
    const items = opened?.items ?? [];
    expect(viewerStep({ index: 0, count: items.length }, "tick")).toEqual({ index: 1, count: 4 });
    expect(viewerJump(items, 0, "next")).toBe(1);
  });

  test("안 만난 칸 → 같은 줄 목록, 그 칸부터 — 거기서도 다음 인물로 넘어가고 마지막이면 닫힘", () => {
    const opened = viewerItemsOf(row, { from: "unmet", characterId: "g" }, url);
    expect(who(opened?.items)).toEqual(["a", "g", "b", "h"]);
    expect(opened?.start).toBe(1);
    const items = opened?.items ?? [];
    expect(viewerStep({ index: 1, count: items.length }, "next")).toEqual({ index: 2, count: 4 });
    expect(viewerJump(items, 1, "next")).toBe(2);
    expect(viewerStep({ index: 3, count: items.length }, "tick")).toBe("close");
    expect(viewerJump(items, 3, "next")).toBe("close");
  });

  test("Watch all은 그대로 내 친구만, 알림은 그 인물 하나", () => {
    expect(who(viewerItemsOf(row, { from: "watch_all" }, url)?.items)).toEqual(["a", "b"]);
    expect(who(viewerItemsOf(row, { from: "push", characterId: "g" }, url)?.items)).toEqual(["g"]);
  });
});
