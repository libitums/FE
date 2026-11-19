import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  advance,
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import type { ChatSource } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { messengerListTestIds as list } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";
import {
  friendDirectoryTestIds as dir,
  suggestedFriendsTestIds as ids,
} from "./suggested-friends.contract";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(ML1 · ML2): 목록 화면 + 가짜 출처 + 가짜 포트. 줄이 목록 위에 서고, 시트의 Start chatting이 방을 열면 목록 맨 위
// NEW 줄 · 줄에서 빠짐 · 토스트 · 이벤트(viewed · added)가 따라오며, See all이 친구 찾기를 엽니다. 손님은 줄이 없습니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const seed = () =>
  seedOf(
    fixtureRoom("clerk", {
      counterpart: { id: "clerk", name: "점원", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 0 },
      messages: [],
      opening: { ko: "어서 오세요!", en: "Welcome!" },
    }),
    fixtureRoom("mina", {
      counterpart: { id: "mina", name: "미나", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 3 },
      messages: [],
    }),
    fixtureRoom("boss", { counterpart: { id: "boss", name: "사장님", avatarPath: null } }),
  );

function portFor(source: ChatSource): SuggestedFriendsPort {
  return {
    catalog: () =>
      catalogOf([
        friend("mina", { name: "미나", unlockEpisode: 3 }),
        general("clerk", { name: "점원", intro: { en: "Works at the mart" } }),
      ]),
    add: (id) => (source.unlockCharacter(id).kind === "unlocked" ? "added" : "already"),
    earlyAccess: null,
  };
}

function mount(access: "open" | "sign-in" = "open") {
  const source = makeSource(seed());
  const sink = vi.fn();
  const onLayerChange = vi.fn<(open: boolean) => void>();
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={onLayerChange}
        notice={null}
        onNoticeShown={vi.fn()}
        access={access}
        onSignIn={vi.fn()}
        friends={portFor(source)}
      />
    </ChatEventsContext.Provider>,
  );
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { source, events, onLayerChange };
}

const rowOrder = (): string[] =>
  Array.from(screen.getByTestId(list.list).querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^messenger-list-row-[^-]+$/.test(id));

test("ML1. 줄이 목록 위에 서고 일반 인물이 먼저, 잠긴 이야기 인물이 뒤 — viewed가 한 번 난다", () => {
  const { events } = mount();
  const row = screen.getByTestId(ids.row);
  expect(screen.getByTestId(list.list).firstElementChild).toBe(row);
  const avatars = Array.from(row.querySelectorAll('[data-testid^="suggested-friends-avatar-"]'));
  expect(avatars.map((el) => el.getAttribute("data-testid"))).toEqual([
    ids.avatar("clerk"),
    ids.avatar("mina"),
  ]);
  expect(events().filter((e) => e.name === "suggested_friend_viewed")).toEqual([
    expect.objectContaining({ name: "suggested_friend_viewed", surface: "chat", count: "2" }),
  ]);
});

test("ML1. 아바타 → 시트 → Start chatting: 방이 목록 맨 위 NEW, 줄에서 빠짐, 토스트, added 이벤트", () => {
  const { events, onLayerChange } = mount();
  fireEvent.tap(screen.getByTestId(ids.avatar("clerk")), {});
  expect(screen.getByTestId(ids.sheet)).toBeInTheDocument();
  expect(onLayerChange).toHaveBeenLastCalledWith(true);

  tapId(ids.sheetStart);

  expect(screen.queryByTestId(ids.sheet)).toBeNull();
  expect(rowOrder()[0]).toBe(list.row("clerk"));
  expect(screen.getByTestId(list.rowNew("clerk"))).toBeInTheDocument();
  expect(screen.queryByTestId(ids.avatar("clerk"))).toBeNull();
  expect(screen.getByTestId(ids.toast).textContent).toContain("점원 added to your chats");
  expect(events().filter((e) => e.name === "suggested_friend_added")).toEqual([
    expect.objectContaining({ characterId: "clerk", kind: "general", from: "row", via: "free" }),
  ]);
  advance(3000);
  expect(screen.queryByTestId(ids.toast)).toBeNull();
});

test("ML1. 잠긴 인물 → 잠긴 시트(먼저 만나기 꺼짐) → Not now로 닫힌다", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.avatar("mina")), {});
  expect(screen.getByTestId(ids.sheetInfo)).toBeInTheDocument();
  expect(screen.queryByTestId(ids.sheetEarly)).toBeNull();
  tapId(ids.sheetLater);
  expect(screen.queryByTestId(ids.sheet)).toBeNull();
});

test("ML1. See all → 친구 찾기, 거기서 Chat → 시트 → Start chatting이면 줄이 Added가 된다", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.seeAll), {});
  expect(screen.getByTestId(dir.screen)).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId(dir.row("clerk")), {});
  tapId(ids.sheetStart);
  expect(screen.getByTestId(dir.action("clerk")).textContent).toBe("Added");
  tapId(dir.back);
  expect(screen.queryByTestId(dir.screen)).toBeNull();
});

test("ML1. 추천할 사람이 없으면 줄이 없다", () => {
  const { source } = mount();
  act(() => {
    source.unlockCharacter("clerk");
    source.unlockCharacter("mina");
  });
  expect(screen.queryByTestId(ids.row)).toBeNull();
});

test("ML2. 손님(가입 안내)에게는 줄이 없다", () => {
  mount("sign-in");
  expect(screen.queryByTestId(ids.row)).toBeNull();
});
