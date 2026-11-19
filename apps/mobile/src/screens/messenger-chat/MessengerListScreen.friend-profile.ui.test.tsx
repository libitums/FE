import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import type { ChatBirthYear } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendProfileTestIds as profileIds } from "./friend-profile.contract";
import { messengerListTestIds as list } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(MP1 ~ MP4, ADR-0162 2026-11-19 · ADR-0163 D2 · D4): 목록 화면 + 가짜 출처 + 가짜 포트. 일반 인물은 서버 목록에 있을 때만
// 서고, 시트를 열면 `friend_profile_opened`, open 친구를 성인이 추가하면 확인 창(확인 · 취소 모두 추가), 나이 모름은 창 없음.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const ADULT: ChatBirthYear = { kind: "set", year: 1995 };

function mount(patch: Partial<SuggestedFriendsPort>, birthYear: ChatBirthYear = ADULT) {
  const source = makeSource({
    ...seedOf(
      fixtureRoom("seoyeon", {
        counterpart: { id: "seoyeon", name: "차서연", avatarPath: null },
        access: { kind: "locked", unlockEpisode: 0 },
        messages: [],
      }),
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "미나", avatarPath: null },
        access: { kind: "locked", unlockEpisode: 3 },
        messages: [],
      }),
    ),
    birthYear,
  });
  const sink = vi.fn<(event: unknown) => void>();
  const port: SuggestedFriendsPort = {
    catalog: () =>
      catalogOf([
        friend("mina", { name: "미나", unlockEpisode: 3 }),
        general("seoyeon", { name: "차서연" }),
      ]),
    add: (id) => (source.unlockCharacter(id).kind === "unlocked" ? "added" : "already"),
    earlyAccess: null,
    ...patch,
  };
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn<(roomId: string) => void>()}
        onGoToJourney={vi.fn<() => void>()}
        onLayerChange={vi.fn<(open: boolean) => void>()}
        notice={null}
        onNoticeShown={vi.fn<() => void>()}
        access="open"
        onSignIn={vi.fn<() => void>()}
        friends={port}
      />
    </ChatEventsContext.Provider>,
  );
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { events };
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

test("MP1. 서버 목록에 없는 일반 인물은 서지 않고, 받기 전 · 못 받음(null)도 없다 — 이야기 인물은 그대로", async () => {
  mount({ visibleFriends: async () => null });
  expect(screen.queryByTestId(ids.avatar("seoyeon"))).toBeNull();
  await flush();
  expect(screen.queryByTestId(ids.avatar("seoyeon"))).toBeNull();
  expect(screen.getByTestId(ids.avatar("mina"))).toBeInTheDocument();
});

test("MP2. 서버 목록에 있으면 서고, 시트를 열면 friend_profile_opened { source: row }", async () => {
  const { events } = mount({
    visibleFriends: async () => [{ id: "seoyeon", romanceTier: "standard" }],
  });
  await flush();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  expect(events().filter((e) => e.name === "friend_profile_opened")).toEqual([
    expect.objectContaining({ characterId: "seoyeon", source: "row" }),
  ]);
});

test("MP3. open 친구 + 생년상 성인 + 동의 없음 → 확인 창, 확인은 동의를 남기고 추가 · 취소도 추가", async () => {
  const ackAdult = vi.fn(async () => true);
  mount({
    visibleFriends: async () => [{ id: "seoyeon", romanceTier: "open" }],
    adultAck: async () => false,
    ackAdult,
  });
  await flush();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  fireEvent.tap(screen.getByTestId(ids.sheetStart), {});
  await flush();
  expect(screen.getByTestId(profileIds.adultDialog)).toBeInTheDocument();
  expect(screen.queryByTestId(list.row("seoyeon"))).toBeNull();
  fireEvent.tap(screen.getByText("I'm an adult"), {});
  expect(ackAdult).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId(profileIds.adultDialog)).toBeNull();
  expect(screen.getByTestId(list.row("seoyeon"))).toBeInTheDocument();
});

test("MP4. 나이 모름은 open 친구여도 창 없이 곧바로 추가 — 동의를 읽지도 않는다", async () => {
  const adultAck = vi.fn(async () => false);
  mount(
    { visibleFriends: async () => [{ id: "seoyeon", romanceTier: "open" }], adultAck },
    { kind: "skipped" },
  );
  await flush();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  fireEvent.tap(screen.getByTestId(ids.sheetStart), {});
  expect(screen.queryByTestId(profileIds.adultDialog)).toBeNull();
  expect(adultAck).not.toHaveBeenCalled();
  expect(screen.getByTestId(list.row("seoyeon"))).toBeInTheDocument();
});
