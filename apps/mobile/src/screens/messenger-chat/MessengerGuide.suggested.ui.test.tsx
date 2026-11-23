import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { clearBackHandlers } from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { COMPANION_CATALOG, companionSeed } from "./companion-roster";
import type { SuggestedFriendsPort, VisibleFriend } from "./friend-catalog.contract";
import {
  messengerChatTestIds as ids,
  messengerListTestIds as list,
} from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { MessengerListScreen } from "./MessengerListScreen";
import { suggestedFriendsTestIds as suggested } from "./suggested-friends.contract";

// `ui` 계층(MG-UI6): 덕수쌤 목록 안내 × 추천 친구 줄(ADR-0139 D2 · ADR-0162). 떠 있는 덕수쌤 줄은 위치를 재지 않고 원본 첫 줄
// 자리(머리 바로 아래)에 서므로, 안내가 떠 있는 동안 원본 목록의 맨 위는 추천 줄이 아니라 채팅 줄이어야 합니다(2026-11-19 기기 지적).

function memoryStore(seen: readonly GuidePart[] = []): GuideStore {
  const parts = new Set<GuidePart>(seen);
  return {
    unseen: (part) => !parts.has(part),
    markSeen: (part) => {
      parts.add(part);
    },
  };
}

// 덕수쌤만 열리고 미나 · 한도윤 · 서재민 · 정윤경은 잠긴 방 — 앱 카탈로그로 추천 줄이 섭니다.
const source = () =>
  createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
  });

const port: SuggestedFriendsPort = {
  catalog: () => COMPANION_CATALOG,
  add: () => "already",
  earlyAccess: null,
};

function mountList(store: GuideStore, friends: SuggestedFriendsPort | undefined) {
  render(
    <MessengerListScreen
      source={source()}
      wallet={createCoinWallet({ earned: 0 })}
      guideStore={store}
      onOpenRoom={vi.fn()}
      onGoToJourney={vi.fn()}
      onLayerChange={vi.fn()}
      notice={null}
      onNoticeShown={vi.fn()}
      access="open"
      onSignIn={vi.fn()}
      {...(friends === undefined ? {} : { friends })}
    />,
  );
}

/** 원본 목록(스크롤 안)의 맨 위 자식 — 떠 있는 줄이 가정하는 첫 줄 자리에 실제로 서는 것. */
const firstListChild = (): string | null =>
  screen.getByTestId(list.list).firstElementChild?.getAttribute("data-testid") ?? null;

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("목록 안내 × 추천 친구 줄", () => {
  test("MG-UI6 안내가 떠 있는 동안 원본 맨 위는 덕수쌤 줄(추천 줄 없음), 닫으면 추천 줄이 다시 맨 위에 선다", () => {
    mountList(memoryStore(), port);
    expect(screen.getByTestId(ids.guideList)).toBeTruthy();
    expect(screen.queryByTestId(suggested.row)).toBeNull();
    expect(firstListChild()).toBe(list.row("duksu"));
    fireEvent.tap(screen.getByTestId(ids.guideListSkip), { eventType: "catchEvent" });
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
    expect(firstListChild()).toBe(suggested.row);
  });

  test("MG-UI6 시험 계정 — 서버 추천 친구가 안내가 뜬 뒤에 도착해도 안내 중에는 추천 줄이 서지 않는다", async () => {
    let arrive: (list: readonly VisibleFriend[]) => void = () => undefined;
    const visibleFriends = () =>
      new Promise<readonly VisibleFriend[] | null>((resolve) => {
        arrive = resolve;
      });
    mountList(memoryStore(), { ...port, visibleFriends });
    await act(async () => {
      arrive([{ id: "seoyeon", romanceTier: "open" }]);
      await Promise.resolve();
    });
    expect(screen.queryByTestId(suggested.row)).toBeNull();
    expect(firstListChild()).toBe(list.row("duksu"));
    fireEvent.tap(screen.getByTestId(ids.guideListSkip), { eventType: "catchEvent" });
    expect(firstListChild()).toBe(suggested.row);
    expect(screen.getByTestId(suggested.avatar("seoyeon"))).toBeTruthy();
  });

  test("MG-UI6 추천이 없으면(포트 없음) 안내는 그대로 서고 원본 맨 위는 덕수쌤 줄", () => {
    mountList(memoryStore(), undefined);
    expect(screen.getByTestId(ids.guideList)).toBeTruthy();
    expect(firstListChild()).toBe(list.row("duksu"));
  });

  test("MG-UI6 안내를 이미 봤으면 추천 줄은 처음부터 맨 위에 선다", () => {
    mountList(memoryStore(["list"]), port);
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
    expect(firstListChild()).toBe(suggested.row);
  });
});
