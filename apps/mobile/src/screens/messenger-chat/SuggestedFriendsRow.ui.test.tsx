import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import type { SuggestedFriend } from "./suggested-friends";
import { SuggestedFriendsRow } from "./SuggestedFriendsRow";
import { friend, general, room } from "./suggested-friends.test-support";

// `ui` 계층(SR1): 추천 친구 줄(R1) — 제목 · See all · 아바타 상태 · EARLY 꼬리표 · 가로 스크롤 · 낭독 라벨. 판정은 unit이 집니다.

afterEach(cleanup);

const friends: readonly SuggestedFriend[] = [
  {
    character: general("g1", { name: "하나" }),
    room: room("g1", false),
    status: "addable",
    offer: null,
  },
  {
    character: friend("jaemin", { name: "서재민", unlockEpisode: 17 }),
    room: room("jaemin", false),
    status: "locked",
    offer: { price: 100, endsAt: null },
  },
  {
    character: friend("mina", { name: "미나", unlockEpisode: 3 }),
    room: room("mina", false),
    status: "locked",
    offer: null,
  },
];

function mount() {
  const onOpen = vi.fn<(f: SuggestedFriend) => void>();
  const onSeeAll = vi.fn<() => void>();
  render(<SuggestedFriendsRow friends={friends} onOpen={onOpen} onSeeAll={onSeeAll} />);
  return { onOpen, onSeeAll };
}

test("SR1. 제목 · See all · 아바타 셋이 카탈로그 순서로 서고 가로로 스크롤한다", () => {
  mount();
  expect(screen.getByTestId(ids.title).textContent).toBe("Meet new friends");
  expect(screen.getByTestId(ids.seeAll).textContent).toBe("See all");
  const avatars = Array.from(
    screen.getByTestId(ids.row).querySelectorAll('[data-testid^="suggested-friends-avatar-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(avatars).toEqual([ids.avatar("g1"), ids.avatar("jaemin"), ids.avatar("mina")]);
  const scroll = screen.getByTestId(ids.row).querySelector("scroll-view");
  expect(scroll?.getAttribute("scroll-orientation")).toBe("horizontal");
});

test("SR1. 추가 가능 = addable(+ 배지), 잠김 = locked — 채팅 목록 줄에는 EARLY 꼬리표가 없다(2026-11-19)", () => {
  mount();
  expect(screen.getByTestId(ids.avatar("g1")).getAttribute("data-state")).toBe("addable");
  expect(screen.getByTestId(ids.avatar("jaemin")).getAttribute("data-state")).toBe("locked");
  expect(screen.getByTestId(ids.row).textContent).not.toContain("EARLY");
});

test("SR1. 낭독 라벨 — 새 친구 · 만날 회차 · 먼저 만나기", () => {
  mount();
  expect(screen.getByTestId(ids.avatar("g1")).getAttribute("accessibility-label")).toBe(
    "하나, new friend",
  );
  expect(screen.getByTestId(ids.avatar("mina")).getAttribute("accessibility-label")).toBe(
    "미나, meet in Episode 3",
  );
  expect(screen.getByTestId(ids.avatar("jaemin")).getAttribute("accessibility-label")).toBe(
    "서재민, meet in Episode 17 or chat now for 100 coins",
  );
});

test("SR1. 아바타 · See all은 Android TalkBack에서도 누를 수 있다(enable-tap · flatten false — ADR-0125 D3)", () => {
  mount();
  for (const id of [ids.avatar("g1"), ids.seeAll]) {
    const el = screen.getByTestId(id);
    expect(el.getAttribute("accessibility-enable-tap"), id).toBe("true");
    expect(el.getAttribute("flatten"), id).toBe("false");
  }
});

test("SR1. 아바타 탭 → onOpen(그 인물), See all 탭 → onSeeAll", () => {
  const { onOpen, onSeeAll } = mount();
  fireEvent.tap(screen.getByTestId(ids.avatar("jaemin")), {});
  expect(onOpen).toHaveBeenCalledWith(friends[1]);
  fireEvent.tap(screen.getByTestId(ids.seeAll), {});
  expect(onSeeAll).toHaveBeenCalledTimes(1);
});
