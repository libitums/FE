import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf } from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(MC2-UI12): 해금된 인물의 NEW 줄 — 해금 뒤 맨 위 · NEW 알약 · 안 읽은 1 · 미리보기 = 첫 메시지 · 낭독 앞 「New friend」 ·
// 열어 보고 돌아오면 NEW가 없다 · 해금 전에는 조건만 보인다. 판정(newBadgeShown)은 unit(chat-list)이 진다.

const OPENING = {
  ko: "안녕! 나 미나야. 오늘 뭐 했어?",
  en: "Hi! It's Mina. What did you do today?",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 10, 12, 0, 0));
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
      access: { kind: "locked", unlockEpisode: 4 },
      messages: [],
    }),
    fixtureRoom("mina", {
      counterpart: { id: "mina", name: "미나", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 3 },
      unread: 0,
      messages: [],
      opening: OPENING,
    }),
    fixtureRoom("boss", {
      counterpart: { id: "boss", name: "사장님", avatarPath: null },
      messages: [
        { kind: "text", from: "them", text: { ko: "어서 오세요", en: "Welcome" }, minutesAgo: 300 },
      ],
    }),
  );

function mount() {
  const source = makeSource(seed());
  const props = {
    source,
    coinBalance: 100,
    wallet: createCoinWallet({ earned: 100 }),
    onOpenRoom: vi.fn<(id: string) => void>(),
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
    notice: null,
    onNoticeShown: vi.fn<() => void>(),
    access: "open" as const,
    onSignIn: vi.fn<() => void>(),
  };
  render(<MessengerListScreen {...props} />);
  return source;
}

const rowOrder = (): string[] =>
  Array.from(screen.getByTestId(ids.list).querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^messenger-list-row-[^-]+$/.test(id));

test("MC2-UI12. 해금 전: 미나 줄은 잠겨 있고 해금 조건을 보이며 NEW가 없다", () => {
  mount();

  expect(screen.getByTestId(ids.row("mina")).getAttribute("data-locked")).toBe("true");
  expect(screen.getByTestId(ids.rowPreview("mina")).textContent).toBe(
    "Play Episode 3 to start chatting",
  );
  expect(screen.queryByTestId(ids.rowNew("mina"))).toBeNull();
  expect(rowOrder()).toEqual([
    "messenger-list-row-boss",
    "messenger-list-row-clerk",
    "messenger-list-row-mina",
  ]);
});

test("MC2-UI12. 해금되면 미나 줄이 맨 위로 오고 NEW 알약 · 안 읽은 1 · 첫 메시지 미리보기가 선다", () => {
  const source = mount();

  act(() => {
    source.unlockCharacter("mina");
  });

  expect(rowOrder()[0]).toBe("messenger-list-row-mina");
  expect(screen.getByTestId(ids.row("mina")).getAttribute("data-locked")).toBe("false");
  expect(screen.getByTestId(ids.rowNew("mina")).textContent?.trim()).toBe("NEW");
  expect(screen.getByTestId(ids.rowUnread("mina")).textContent).toBe("1");
  expect(screen.getByTestId(ids.rowPreview("mina")).textContent).toContain(OPENING.ko);
});

test("MC2-UI12. NEW는 해금된 그 줄에만 있다", () => {
  const source = mount();

  act(() => {
    source.unlockCharacter("mina");
  });

  expect(screen.getByTestId(ids.rowNew("mina"))).toBeTruthy();
  expect(screen.queryByTestId(ids.rowNew("boss"))).toBeNull();
  expect(screen.queryByTestId(ids.rowNew("clerk"))).toBeNull();
});

test("MC2-UI12. 줄 낭독은 「New friend」로 시작하고 이름 · 첫 메시지를 읽으며 NEW 알약은 낭독에서 숨는다", () => {
  const source = mount();

  act(() => {
    source.unlockCharacter("mina");
  });

  const label = screen.getByTestId(ids.row("mina")).getAttribute("accessibility-label") ?? "";
  expect(label.startsWith("New friend")).toBe(true);
  expect(label).toContain("미나");
  expect(label).toContain(OPENING.ko);
  const badge = screen.getByTestId(ids.rowNew("mina"));
  expect(
    badge.getAttribute("accessibility-elements-hidden") ??
      badge.parentElement?.getAttribute("accessibility-elements-hidden"),
  ).toBe("true");
});

test("MC2-UI12. 줄을 열어 보고 돌아오면 NEW와 안 읽은 수가 사라진다(낭독도 일반으로 돌아간다)", () => {
  const source = mount();
  act(() => {
    source.unlockCharacter("mina");
  });
  expect(screen.getByTestId(ids.rowNew("mina"))).toBeTruthy();

  act(() => {
    source.openRoom("mina");
  });
  act(() => {
    source.closeRoom("mina");
  });

  expect(screen.queryByTestId(ids.rowNew("mina"))).toBeNull();
  expect(screen.queryByTestId(ids.rowUnread("mina"))).toBeNull();
  const label = screen.getByTestId(ids.row("mina")).getAttribute("accessibility-label") ?? "";
  expect(label.startsWith("New friend")).toBe(false);
});

test("MC2-UI12. 해금된 줄을 탭하면 그 roomId로 열린다", () => {
  const source = makeSource(seed());
  const onOpenRoom = vi.fn<(id: string) => void>();
  const props = {
    source,
    coinBalance: 100,
    wallet: createCoinWallet({ earned: 100 }),
    onOpenRoom,
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
    notice: null,
    onNoticeShown: vi.fn<() => void>(),
    access: "open" as const,
    onSignIn: vi.fn<() => void>(),
  };
  render(<MessengerListScreen {...props} />);
  act(() => {
    source.unlockCharacter("mina");
  });

  expect(screen.getByTestId(ids.rowNew("mina"))).toBeTruthy();
  fireEvent.tap(screen.getByTestId(ids.row("mina")), {});

  expect(onOpenRoom).toHaveBeenCalledTimes(1);
  expect(onOpenRoom).toHaveBeenCalledWith("mina");
});
