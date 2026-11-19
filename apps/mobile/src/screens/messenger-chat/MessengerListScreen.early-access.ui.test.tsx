import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { EarlyAccessResult, SuggestedFriendsPort } from "./friend-catalog.contract";
import { messengerListTestIds as list } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(ML4 ~ ML6, ADR-0162 D5): 먼저 만나기 — 서버 제안(포트 `offers`)이 카탈로그에 얹혀 줄에 「EARLY · 100」이 서고,
// 열림이면 기존 추가 길(방 열기 · NEW · 토스트)을 타며, 실패(제안 없음 · 오류)면 시트를 그대로 두고 실패 줄을 띄운다.
// 결과마다 `early_access_completed`가 한 번 난다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

async function mount(result: () => Promise<EarlyAccessResult>) {
  const source = makeSource(
    seedOf(
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "미나", avatarPath: null },
        access: { kind: "locked", unlockEpisode: 3 },
        messages: [],
      }),
      fixtureRoom("boss", { counterpart: { id: "boss", name: "사장님", avatarPath: null } }),
    ),
  );
  const early = vi.fn<(id: string) => Promise<EarlyAccessResult>>(result);
  const port: SuggestedFriendsPort = {
    catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 3 })]),
    add: (id) => (source.unlockCharacter(id).kind === "unlocked" ? "added" : "already"),
    earlyAccess: early,
    offers: async () => [{ characterId: "mina", price: 100, endsAt: null }],
  };
  const sink = vi.fn();
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
  await flush();
  const events = (name: string) =>
    sink.mock.calls.map(([event]) => event as { name: string }).filter((e) => e.name === name);
  return { early, events };
}

async function tapChatNow() {
  fireEvent.tap(screen.getByTestId(ids.avatar("mina")), {});
  tapId(ids.sheetEarly);
  await flush();
}

test("ML4. 서버 제안이 줄 · 시트에 얹힌다 — EARLY · 100, Chat now · 100, LIMITED(끝 시각 없음)", async () => {
  await mount(async () => ({ kind: "unlocked" }));
  expect(screen.getByTestId(ids.early("mina")).textContent).toBe("EARLY · 100");
  fireEvent.tap(screen.getByTestId(ids.avatar("mina")), {});
  expect(screen.getByTestId(ids.sheetEarly).textContent).toContain("Chat now · 100");
  expect(screen.getByTestId(ids.sheetLimited).textContent).toBe("LIMITED");
});

test("ML5. 열림 → 기존 추가 길: 방이 맨 위 NEW, 줄에서 빠짐, 토스트, completed(unlocked) · added(via early)", async () => {
  const { early, events } = await mount(async () => ({ kind: "unlocked" }));
  await tapChatNow();
  expect(early).toHaveBeenCalledWith("mina");
  expect(screen.queryByTestId(ids.sheet)).toBeNull();
  expect(screen.getByTestId(list.rowNew("mina"))).toBeInTheDocument();
  expect(screen.queryByTestId(ids.row)).toBeNull();
  expect(screen.getByTestId(ids.toast).textContent).toContain("미나 added to your chats");
  expect(events("early_access_tapped")).toHaveLength(1);
  expect(events("early_access_completed")).toEqual([
    expect.objectContaining({ characterId: "mina", outcome: "unlocked" }),
  ]);
  expect(events("suggested_friend_added")).toEqual([
    expect.objectContaining({ characterId: "mina", via: "early", kind: "story" }),
  ]);
});

test("ML6. 실패(제안 없음 · 오류)면 시트를 그대로 두고 실패 줄을 띄운다 — 방은 열리지 않는다", async () => {
  const { events } = await mount(async () => ({ kind: "failed" }));
  await tapChatNow();
  expect(screen.getByTestId(ids.sheet)).toBeInTheDocument();
  expect(screen.getByTestId(ids.toast).textContent).toContain("Couldn't add 미나. Try again.");
  expect(screen.queryByTestId(list.row("mina"))).toBeNull();
  expect(events("early_access_completed")).toEqual([
    expect.objectContaining({ outcome: "failed" }),
  ]);
});

test("ML6. 요청이 던져도 같다(시트 그대로 · 실패 줄)", async () => {
  await mount(async () => {
    throw new Error("network");
  });
  await tapChatNow();
  expect(screen.getByTestId(ids.sheet)).toBeInTheDocument();
  expect(screen.getByTestId(ids.toast)).toBeInTheDocument();
});
