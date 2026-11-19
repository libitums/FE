import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import { directoryChipsOf, directoryOf } from "./friend-directory";
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import { friendDirectoryTestIds as ids } from "./suggested-friends.contract";
import { FriendDirectoryScreen } from "./FriendDirectoryScreen";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `ui` 계층(FD1): 친구 찾기(R5) — 뒤로 · 칩 · 두 섹션 · 줄 동작 · 꼬리 줄. 칩 · 섹션 판정은 unit(friend-directory)이 집니다.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const catalog = catalogOf(
  [
    friend("duksu", { name: "덕수쌤", unlockEpisodeId: null, unlockEpisode: null }),
    friend("jaemin", {
      name: "서재민",
      unlockEpisode: 17,
      earlyAccess: { price: 100, endsAt: null },
    }),
    friend("mina", { name: "미나", unlockEpisode: 3 }),
    general("g1", { name: "하나", category: "food", intro: { en: "Loves cooking" } }),
  ],
  [{ id: "food", label: { en: "Food" } }],
);
const rooms = [room("duksu", true), room("jaemin", false), room("mina", false), room("g1", false)];

function mount(filter: DirectoryFilter = { kind: "all" }) {
  const directory = directoryOf({ catalog, rooms, earlyAccess: true, now: 0, filter });
  const handlers = {
    onFilter: vi.fn<(f: DirectoryFilter) => void>(),
    onOpen: vi.fn<(r: DirectoryRow) => void>(),
    onBack: vi.fn<() => void>(),
  };
  render(
    <FriendDirectoryScreen
      chips={directoryChipsOf(catalog)}
      filter={filter}
      story={directory.story}
      general={directory.general}
      categoryLabel={(id) => (id === "food" ? "Food" : id)}
      {...handlers}
    />,
  );
  return handlers;
}

test("FD1. 제목 · 칩 넷(All 선택) · 두 섹션 · 꼬리 줄", () => {
  mount();
  expect(screen.getByTestId(ids.screen).textContent).toContain("Find friends");
  expect(screen.getByTestId(ids.chip("all")).getAttribute("data-selected")).toBe("true");
  expect(screen.getByTestId(ids.chip("story")).textContent).toBe("From your story");
  expect(screen.getByTestId(ids.chip("category-food")).textContent).toBe("Food");
  expect(screen.getByTestId(ids.sectionStory).textContent).toContain("FROM YOUR STORY");
  expect(screen.getByTestId(ids.sectionGeneral).textContent).toContain("NEW FRIENDS");
  expect(screen.getByTestId(ids.more).textContent).toBe("More friends are on the way");
});

test("FD1. 줄 동작 — 먼저 만나기 🪙100 + LIMITED · 잠김 회차 · Added · Chat(+ NEW)", () => {
  mount();
  expect(screen.getByTestId(ids.action("jaemin")).getAttribute("data-action")).toBe("early");
  expect(screen.getByTestId(ids.action("jaemin")).textContent).toContain("100");
  expect(screen.getByTestId(ids.action("jaemin")).textContent).toContain("LIMITED");
  expect(screen.getByTestId(ids.action("mina")).textContent).toBe("Ep. 3");
  expect(screen.getByTestId(ids.action("duksu")).textContent).toBe("Added");
  expect(screen.getByTestId(ids.action("g1")).textContent).toBe("Chat");
  expect(screen.getByTestId(ids.row("g1")).textContent).toContain("NEW");
  expect(screen.getByTestId(ids.row("g1")).textContent).toContain("Loves cooking");
  expect(screen.getByTestId(ids.row("mina")).textContent).toContain("Meet in Episode 3");
});

test("FD1. 줄 탭 → onOpen(그 줄), Added 줄은 열지 않는다", () => {
  const { onOpen } = mount();
  fireEvent.tap(screen.getByTestId(ids.row("g1")), {});
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ action: "chat" }));
  fireEvent.tap(screen.getByTestId(ids.row("duksu")), {});
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("FD1. 칩 탭 → onFilter, 뒤로 · 시스템 뒤로가기 → onBack", () => {
  const { onFilter, onBack } = mount();
  fireEvent.tap(screen.getByTestId(ids.chip("story")), {});
  expect(onFilter).toHaveBeenCalledWith({ kind: "story" });
  tapId(ids.back);
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(systemBack()).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(2);
});

test("FD1. 필터가 story면 NEW FRIENDS 섹션이 없다", () => {
  mount({ kind: "story" });
  expect(screen.queryByTestId(ids.sectionGeneral)).toBeNull();
  expect(screen.getByTestId(ids.chip("story")).getAttribute("data-selected")).toBe("true");
});
