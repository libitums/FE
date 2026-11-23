import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../lib/back-handler";
import { AppHeader } from "./AppHeader";
import type { TicketHeaderWiring } from "./use-learning-tickets";

// `ui` 계층(GT-U1 ~ GT-U4): 비회원 티켓 모달(ADR-0166, 2026-11-20) — Get more tickets는 「Coming soon」 안내 대신 「로그인 필요」
// 대화상자(trigger tickets). 주 단추는 로그인 흐름, Not now는 닫기만. 회원은 지금 동작(onGetMore) 그대로.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function mount(guest: boolean) {
  const onGetMore = vi.fn<() => void>();
  const onSignIn = vi.fn<() => void>();
  const sink = vi.fn();
  const tickets: TicketHeaderWiring = {
    status: { available: 3, slots: [], nextInMs: null },
    more: null,
    onGetMore,
    onModalChange: vi.fn<(open: boolean) => void>(),
    dropFrom: null,
    onDropped: vi.fn<() => void>(),
    signIn: guest ? { onSignIn, sink } : null,
  };
  render(
    <AppHeader streakDays={1} trophyCount={0} onOpenNotifications={() => {}} tickets={tickets} />,
  );
  fireEvent.tap(screen.getByTestId("top-bar-tickets"), {});
  fireEvent.tap(screen.getByTestId("ticket-modal-more"), {});
  const events = () => sink.mock.calls.map(([event]) => event as Record<string, string>);
  return { onGetMore, onSignIn, events };
}

const prompt = () => screen.queryByTestId("messenger-sign-in-prompt");
const tapAction = (id: "sign-in" | "later") =>
  fireEvent.tap(
    within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button"),
    {},
  );

test("GT-U1 비회원 Get more tickets → 티켓 문구 대화상자, 지급 · 안내 없음", () => {
  const { onGetMore } = mount(true);
  expect(prompt()).not.toBeNull();
  expect(screen.getByTestId("ui-lynx-dialog-title").textContent).toBe("Get 1 ticket");
  expect(screen.getByTestId("ui-lynx-dialog-description").textContent).toBe(
    "Create a free account to keep your Yeopjeon and tickets.",
  );
  expect(onGetMore).not.toHaveBeenCalled();
  expect(screen.queryByTestId("ticket-modal-more-notice")).toBeNull();
});

test("GT-U2 Not now는 닫기만(tickets · later), 주 단추는 로그인 흐름(tickets · sign_in)", () => {
  const { onSignIn, events } = mount(true);
  tapAction("later");
  expect(prompt()).toBeNull();
  expect(onSignIn).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId("ticket-modal-more"), {});
  tapAction("sign-in");
  expect(onSignIn).toHaveBeenCalledTimes(1);
  expect(events()).toEqual([
    expect.objectContaining({
      name: "chat_sign_in_prompt_closed",
      trigger: "tickets",
      choice: "later",
    }),
    expect.objectContaining({
      name: "chat_sign_in_prompt_closed",
      trigger: "tickets",
      choice: "sign_in",
    }),
  ]);
});

test("GT-U3 회원(signIn 없음)은 그대로 onGetMore — 대화상자 없음", () => {
  const { onGetMore } = mount(false);
  expect(onGetMore).toHaveBeenCalledTimes(1);
  expect(prompt()).toBeNull();
});

test("GT-U4 대화상자가 떠 있는 동안 뒤 티켓 모달은 낭독에서 숨고, 닫으면 돌아온다", () => {
  mount(true);
  expect(screen.getByTestId("ticket-modal").getAttribute("accessibility-elements-hidden")).toBe(
    "true",
  );
  tapAction("later");
  expect(
    screen.getByTestId("ticket-modal").getAttribute("accessibility-elements-hidden"),
  ).toBeNull();
});
