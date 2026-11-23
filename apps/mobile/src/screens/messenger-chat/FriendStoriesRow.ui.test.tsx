import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { storyRowOf } from "./friend-stories";
import { friendStoriesTestIds as ids } from "./friend-stories.contract";
import { HOUR_MS, STORY_NOW, story } from "./friend-stories.test-support";
import { FriendStoriesRow } from "./FriendStoriesRow";
import { suggestedFriendsTestIds } from "./suggested-friends.contract";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `ui` 계층(FS-UI1 · UI2): 스토리 줄(ADR-0177 D3) — 제목 · Watch all · 친구(안 본 것 · 본 것) · 구분 선 · 안 만난 친구 · 추천 · Find friends.

afterEach(cleanup);

function mount(seenIds: readonly string[] = ["s-b"]) {
  const catalog = catalogOf([
    friend("a", { name: "윤경" }),
    friend("b", { name: "해준" }),
    general("g", { name: "다은" }),
    general("h", { name: "건우" }),
  ]);
  const named = (id: string, name: string) => ({ id, name, avatarUrl: `https://img/${id}.webp` });
  const rooms = [
    room("a", true, { counterpart: named("a", "윤경") }),
    room("b", true, { counterpart: named("b", "해준") }),
    room("g", false),
    room("h", false),
  ];
  const row = storyRowOf({
    stories: [
      story("a", { postedAt: STORY_NOW - 2 * HOUR_MS }),
      story("b", { postedAt: STORY_NOW - 5 * HOUR_MS }),
      story("g"),
    ],
    rooms,
    suggested: suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: STORY_NOW }),
    seen: new Set(seenIds),
    now: STORY_NOW,
  });
  const handlers = {
    onOpenFriend: vi.fn(),
    onOpenUnmet: vi.fn(),
    onOpenSuggested: vi.fn(),
    onWatchAll: vi.fn(),
    onFindFriends: vi.fn(),
  };
  render(<FriendStoriesRow row={row} now={STORY_NOW} {...handlers} />);
  return handlers;
}

const order = () =>
  Array.from(screen.getByTestId(ids.row).querySelectorAll("[data-testid]"))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^friend-stories-(friend|unmet|suggested|divider|find)/.test(id));

test("FS-UI1. 제목 · Watch all, 순서는 친구(안 본 → 본) · 선 · 안 만난 친구 · 추천 · Find friends", () => {
  mount();
  expect(screen.getByTestId(ids.title).textContent).toBe("Stories");
  expect(screen.getByTestId(ids.title).getAttribute("accessibility-traits")).toBe("header");
  expect(screen.getByTestId(ids.watchAll).textContent).toBe("Watch all");
  expect(order()).toEqual([
    ids.friend("a"),
    ids.friend("b"),
    ids.divider,
    ids.unmet("g"),
    ids.suggested("h"),
    ids.findFriends,
  ]);
  const scroll = screen.getByTestId(ids.row).querySelector("scroll-view");
  expect(scroll?.getAttribute("scroll-orientation")).toBe("horizontal");
});

test("FS-UI1. 안 본 것은 경과 시간 · 본 것은 Seen · 안 만난 친구는 New — 고리 상태와 낭독", () => {
  mount();
  const a = screen.getByTestId(ids.friend("a"));
  expect(a.getAttribute("data-state")).toBe("unseen");
  expect(a.textContent).toContain("윤경");
  expect(a.textContent).toContain("2h");
  expect(a.getAttribute("accessibility-label")).toBe("윤경's story, 2h, new");
  const b = screen.getByTestId(ids.friend("b"));
  expect(b.getAttribute("data-state")).toBe("seen");
  expect(b.textContent).toContain("Seen");
  expect(b.getAttribute("accessibility-label")).toBe("해준's story, 5h, seen");
  const g = screen.getByTestId(ids.unmet("g"));
  expect(g.getAttribute("data-state")).toBe("unmet");
  expect(g.textContent).toContain("New");
  expect(g.getAttribute("accessibility-label")).toBe("다은's story, new friend");
  for (const id of [ids.friend("a"), ids.unmet("g"), ids.findFriends, ids.watchAll]) {
    const el = screen.getByTestId(id);
    expect(el.getAttribute("accessibility-traits"), id).toBe("button");
    expect(el.getAttribute("accessibility-enable-tap"), id).toBe("true");
    expect(el.getAttribute("flatten"), id).toBe("false");
  }
});

test("FS-UI2. 탭은 저마다의 콜백으로", () => {
  const h = mount();
  fireEvent.tap(screen.getByTestId(ids.friend("b")));
  expect(h.onOpenFriend).toHaveBeenCalledWith(expect.objectContaining({ seen: true }));
  fireEvent.tap(screen.getByTestId(ids.unmet("g")));
  expect(h.onOpenUnmet.mock.calls[0]?.[0].story.characterId).toBe("g");
  // 추천 아바타는 감싸개 안 추천 줄의 칸 그대로 — 탭은 그 칸이 받습니다.
  fireEvent.tap(screen.getByTestId(suggestedFriendsTestIds.avatar("h")));
  expect(h.onOpenSuggested.mock.calls[0]?.[0].character.id).toBe("h");
  fireEvent.tap(screen.getByTestId(ids.watchAll));
  expect(h.onWatchAll).toHaveBeenCalledTimes(1);
  fireEvent.tap(screen.getByTestId(ids.findFriends));
  expect(h.onFindFriends).toHaveBeenCalledTimes(1);
});

test("FS-UI1. 친구 스토리가 없으면 Watch all · 구분 선이 없다", () => {
  const catalog = catalogOf([general("g", { name: "다은" })]);
  const rooms = [room("g", false)];
  const row = storyRowOf({
    stories: [story("g")],
    rooms,
    suggested: suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: STORY_NOW }),
    seen: new Set(),
    now: STORY_NOW,
  });
  render(
    <FriendStoriesRow
      row={row}
      now={STORY_NOW}
      onOpenFriend={vi.fn()}
      onOpenUnmet={vi.fn()}
      onOpenSuggested={vi.fn()}
      onWatchAll={vi.fn()}
      onFindFriends={vi.fn()}
    />,
  );
  expect(screen.queryByTestId(ids.watchAll)).toBeNull();
  expect(screen.queryByTestId(ids.divider)).toBeNull();
  expect(screen.getByTestId(ids.unmet("g"))).not.toBeNull();
});
