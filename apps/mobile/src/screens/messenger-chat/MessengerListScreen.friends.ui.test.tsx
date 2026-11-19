import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type {
  AdultAckPort,
  AdultAckState,
  SuggestedFriendsPort,
  VisibleFriend,
} from "./friend-catalog.contract";
import { messengerListTestIds as list } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(MF1 ~ MF5): 추천 친구(ADR-0164) — 서버가 보인 친구만 줄에 서고, 프로필을 열면 opened 이벤트, open 친구를 처음
// 추가하는 성인(동의 없음 · 아직 묻지 않음)에게는 「Get closer」 시트가 선다. Sounds good = 동의 후 추가, Just friends for now =
// 동의 없이 추가, 동의 실패 = 그래도 추가, 뒤로가기 = 추가 안 함.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const locked = (id: string, name: string) =>
  fixtureRoom(id, {
    counterpart: { id, name, avatarPath: null },
    access: { kind: "locked", unlockEpisode: 0 },
    messages: [],
    opening: { ko: "안녕하세요!", en: "Hello!" },
  });

const seed = () =>
  seedOf(
    locked("seoyeon", "차서연"),
    locked("daeun", "송다은"),
    fixtureRoom("mina", {
      counterpart: { id: "mina", name: "미나", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 3 },
      messages: [],
    }),
    fixtureRoom("duksu", { counterpart: { id: "duksu", name: "덕수쌤", avatarPath: null } }),
  );

type Options = {
  readonly visible?: readonly VisibleFriend[] | null;
  readonly state?: AdultAckState | null;
  readonly asked?: boolean;
  readonly ackResult?: boolean;
};

async function mount(options: Options = {}) {
  const source = makeSource(seed());
  const sink = vi.fn();
  let asked = options.asked ?? false;
  const adultAck = {
    state: vi.fn(async () =>
      options.state === undefined
        ? ({ ageBand: "adult", adultAck: false } as const)
        : options.state,
    ),
    confirm: vi.fn(async () => options.ackResult ?? true),
    asked: vi.fn(() => asked),
    markAsked: vi.fn(() => {
      asked = true;
    }),
  } satisfies AdultAckPort;
  const port: SuggestedFriendsPort = {
    catalog: () =>
      catalogOf([
        friend("mina", { name: "미나", unlockEpisode: 3 }),
        general("seoyeon", { name: "차서연", romanceTier: "open", gender: "female" }),
        general("daeun", { name: "송다은", romanceTier: "standard", gender: "female" }),
      ]),
    add: (id) => (source.unlockCharacter(id).kind === "unlocked" ? "added" : "already"),
    earlyAccess: null,
    visibleFriends: async () =>
      options.visible === undefined
        ? [
            { id: "seoyeon", romanceTier: "open" },
            { id: "daeun", romanceTier: "standard" },
          ]
        : options.visible,
    adultAck,
  };
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={port}
      />
    </ChatEventsContext.Provider>,
  );
  await settle();
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { source, adultAck, events };
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}

const rowAvatars = (): (string | null)[] =>
  Array.from(
    screen.queryByTestId(ids.row)?.querySelectorAll('[data-testid^="suggested-friends-avatar-"]') ??
      [],
  ).map((el) => el.getAttribute("data-testid"));

async function start(id: string) {
  fireEvent.tap(screen.getByTestId(ids.avatar(id)), {});
  tapId(ids.sheetStart);
  await settle();
}

test("MF1. 서버가 보인 친구만 서버 순서로 · 빈 목록이면 일반 인물이 없고 이야기 인물만", async () => {
  await mount({
    visible: [
      { id: "daeun", romanceTier: "standard" },
      { id: "seoyeon", romanceTier: "open" },
    ],
  });
  expect(rowAvatars()).toEqual([ids.avatar("daeun"), ids.avatar("seoyeon"), ids.avatar("mina")]);
  cleanup();
  await mount({ visible: [] });
  expect(rowAvatars()).toEqual([ids.avatar("mina")]);
  cleanup();
  await mount({ visible: null });
  expect(rowAvatars()).toEqual([ids.avatar("mina")]);
});

test("MF2. 프로필을 열면 opened 이벤트(인물 · 종류 · 자리)", async () => {
  const { events } = await mount();
  fireEvent.tap(screen.getByTestId(ids.avatar("daeun")), {});
  expect(events().filter((e) => e.name === "suggested_friend_opened")).toEqual([
    expect.objectContaining({ characterId: "daeun", kind: "general", from: "row" }),
  ]);
});

test("MF3. open 친구 · 성인 · 동의 없음 → Get closer 시트, Sounds good이면 동의를 부르고 추가한다", async () => {
  const { adultAck, events } = await mount();
  await start("seoyeon");
  expect(screen.queryByTestId(ids.sheet)).toBeNull();
  expect(screen.getByTestId(ids.adultAck).textContent).toContain("Get closer with 차서연?");
  expect(screen.queryByTestId(list.row("seoyeon"))).toBeNull();

  tapId(ids.adultAckConfirm);
  await settle();
  expect(adultAck.confirm).toHaveBeenCalledTimes(1);
  expect(adultAck.markAsked).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId(ids.adultAck)).toBeNull();
  expect(screen.getByTestId(list.row("seoyeon"))).toBeInTheDocument();
  expect(events().filter((e) => e.name === "suggested_friend_added")).toEqual([
    expect.objectContaining({ characterId: "seoyeon", via: "free" }),
  ]);
});

test("MF6. 프로필을 읽는 동안 프로필 시트는 그대로이고, Get closer가 설 때 닫힌다(빈 화면 없음)", async () => {
  await mount();
  fireEvent.tap(screen.getByTestId(ids.avatar("seoyeon")), {});
  tapId(ids.sheetStart);
  // 서버 프로필을 아직 읽는 중 — 프로필 시트가 남아 있어야 합니다.
  expect(screen.getByTestId(ids.sheet)).toBeInTheDocument();
  expect(screen.queryByTestId(ids.adultAck)).toBeNull();
  await settle();
  expect(screen.queryByTestId(ids.sheet)).toBeNull();
  expect(screen.getByTestId(ids.adultAck)).toBeInTheDocument();
});

test("MF3. Just friends for now면 동의를 부르지 않고 추가하고, 물었다고 적는다", async () => {
  const { adultAck } = await mount();
  await start("seoyeon");
  tapId(ids.adultAckDecline);
  await settle();
  expect(adultAck.confirm).not.toHaveBeenCalled();
  expect(adultAck.markAsked).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(list.row("seoyeon"))).toBeInTheDocument();
});

test("MF4. 동의 호출이 실패해도 막지 않고 추가한다(standard로 대화)", async () => {
  const { adultAck } = await mount({ ackResult: false });
  await start("seoyeon");
  tapId(ids.adultAckConfirm);
  await settle();
  expect(adultAck.confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(list.row("seoyeon"))).toBeInTheDocument();
});

test("MF4. 시스템 뒤로가기는 시트만 닫고 추가하지 않으며 물었다고 적지 않는다", async () => {
  const { adultAck } = await mount();
  await start("seoyeon");
  expect(systemBack()).toBe(true);
  await settle();
  expect(screen.queryByTestId(ids.adultAck)).toBeNull();
  expect(screen.queryByTestId(list.row("seoyeon"))).toBeNull();
  expect(adultAck.markAsked).not.toHaveBeenCalled();
});

test.each([
  ["standard 친구", "daeun", {}],
  ["이미 물음", "seoyeon", { asked: true }],
  ["이미 동의", "seoyeon", { state: { ageBand: "adult", adultAck: true } }],
  ["나이 모름", "seoyeon", { state: { ageBand: "unknown", adultAck: false } }],
  ["프로필 못 읽음", "seoyeon", { state: null }],
] as const)(
  "MF5. %s — 시트 없이 바로 추가하고 동의를 부르지 않는다",
  async (_label, id, options) => {
    const { adultAck } = await mount(options);
    await start(id);
    expect(screen.queryByTestId(ids.adultAck)).toBeNull();
    expect(screen.getByTestId(list.row(id))).toBeInTheDocument();
    expect(adultAck.confirm).not.toHaveBeenCalled();
  },
);
