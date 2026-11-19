import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, tapButtonIn, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createFixtureChatSource } from "./chat-fixture-source";
import { createCoinWallet } from "./coin-wallet";
import { COMPANION_CATALOG, guestCompanionSeed } from "./companion-roster";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { messengerAccessTestIds as access } from "./messenger-access";
import {
  messengerChatTestIds as room,
  messengerListTestIds as list,
} from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { MessengerListScreen } from "./MessengerListScreen";
import { suggestedFriendsTestIds as sf } from "./suggested-friends.contract";

// `ui` 계층(GL-U1 ~ GL-U4): 비회원 메신저 목록(ADR-0166) — 회원과 같은 목록(덕수쌤 줄 · 추천 친구 줄 · 첫 입장 안내 · 엽전 칩),
// 가입 권유 안내는 없음. 엽전 칩 · 추천 친구 「Start chatting」은 「로그인 필요」 대화상자(추가하지 않음).

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function memoryGuide(seen: readonly GuidePart[] = []): GuideStore {
  const parts = new Set<GuidePart>(seen);
  return { unseen: (part) => !parts.has(part), markSeen: (part) => void parts.add(part) };
}

function mount(seen: readonly GuidePart[] = ["list"]) {
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: guestCompanionSeed(),
    greetOnOpen: true,
  });
  const add = vi.fn(() => "added" as const);
  const port: SuggestedFriendsPort = {
    catalog: () => COMPANION_CATALOG,
    add,
    earlyAccess: null,
    offers: null,
  };
  const sink = vi.fn();
  const onSignIn = vi.fn();
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 30 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="preview"
        onSignIn={onSignIn}
        guideStore={memoryGuide(seen)}
        friends={port}
      />
    </ChatEventsContext.Provider>,
  );
  const events = () => sink.mock.calls.map(([event]) => event as Record<string, string>);
  return { add, onSignIn, events };
}

test("GL-U1 비회원은 가입 권유 안내 대신 회원과 같은 목록 — 덕수쌤 줄(첫 인사 미리보기) · 추천 친구 줄 · 엽전 칩", () => {
  mount();
  expect(screen.queryByTestId(access.gate)).toBeNull();
  expect(screen.getByTestId(list.row("duksu")).textContent).toContain("안녕하세요! 덕수쌤이에요.");
  expect(screen.queryByTestId(list.row("guesthouse"))).toBeNull();
  expect(screen.getByTestId(sf.row)).toBeInTheDocument();
  expect(screen.getByTestId(sf.avatar("seoyeon"))).toBeInTheDocument();
  expect(screen.getByTestId(list.coins)).toBeInTheDocument();
});

test("GL-U2 처음 들어오면 덕수쌤 첫 입장 안내가 선다", () => {
  mount([]);
  expect(screen.getByTestId(room.guideList)).toBeInTheDocument();
});

test("GL-U3 추천 친구 Start chatting은 추가하지 않고 대화상자(add_friend) — 주 단추가 로그인 흐름을 부른다", () => {
  const { add, onSignIn, events } = mount();
  fireEvent.tap(screen.getByTestId(sf.avatar("daeun")), {});
  tapId(sf.sheetStart);

  expect(add).not.toHaveBeenCalled();
  expect(screen.queryByTestId(sf.sheet)).toBeNull();
  expect(screen.getByTestId(access.prompt)).toBeInTheDocument();
  tapButtonIn("ui-lynx-dialog-action-sign-in");
  expect(onSignIn).toHaveBeenCalledTimes(1);
  expect(events().filter((e) => e.name === "chat_sign_in_prompt_closed")).toEqual([
    expect.objectContaining({ trigger: "add_friend", choice: "sign_in" }),
  ]);
});

test("GL-U4 엽전 칩은 상점 대신 대화상자(coins), Not now로 닫힌다", () => {
  const { onSignIn } = mount();
  tapId(list.coins);
  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(screen.getByTestId(access.prompt)).toBeInTheDocument();
  tapButtonIn("ui-lynx-dialog-action-later");
  expect(screen.queryByTestId(access.prompt)).toBeNull();
  expect(onSignIn).not.toHaveBeenCalled();
});
