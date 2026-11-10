import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { UnlimitedPassView } from "../../lib/unlimited-pass";
import { UnlimitedTicketModal } from "./UnlimitedTicketModal";

// `ui` 계층: 무제한 티켓 모달(ADR-0115) — 시험 계정 · 구독 갱신 · 갱신 꺼짐 · 곧 끝남 네 모양.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function renderModal(view: UnlimitedPassView) {
  const handlers = {
    onClose: vi.fn<() => void>(),
    onManageSubscription: vi.fn<() => void>(),
    onKeepUnlimited: vi.fn<() => void>(),
  };
  render(<UnlimitedTicketModal view={view} {...handlers} />);
  return handlers;
}

const id = (testId: string) => screen.getByTestId(`unlimited-ticket-modal-${testId}`);
const none = (testId: string) =>
  expect(screen.queryByTestId(`unlimited-ticket-modal-${testId}`)).not.toBeInTheDocument();

test("UM1. 시험 계정 — GUEST PASS · 안내 문구 · Got it이 닫는다, 기간 카드 · 구독 버튼 없음", () => {
  const { onClose } = renderModal({ kind: "guest" });

  expect(id("title")).toHaveTextContent("Unlimited tickets");
  expect(id("plan")).toHaveTextContent("GUEST PASS");
  const hero = screen
    .getByTestId("unlimited-ticket-modal")
    .querySelector('[accessibility-traits="header"]');
  expect(hero?.getAttribute("accessibility-label")).toBe("Unlimited tickets, GUEST PASS");
  expect(id("message")).toHaveTextContent("Every lesson and roleplay is open");
  none("period");
  none("manage");
  none("keep");
  fireEvent.tap(id("got-it"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("UM2. 구독 갱신 — Renews on · 날짜 · Member since · 요금제 알약 · Manage subscription", () => {
  const { onManageSubscription } = renderModal({
    kind: "renews",
    on: { year: 2026, month: 12, day: 9 },
    since: { year: 2026, month: 10, day: 9 },
    planLabel: "PLUS",
  });

  expect(id("plan")).toHaveTextContent("PLUS");
  expect(id("period-label")).toHaveTextContent("Renews on");
  expect(id("period")).toHaveTextContent("Member since Oct 9");
  expect(id("period-date")).toHaveTextContent("Dec 9, 2026");
  expect(id("message")).toHaveTextContent("Start any lesson without a ticket.");
  none("got-it");
  none("keep");
  fireEvent.tap(id("manage"));
  expect(onManageSubscription).toHaveBeenCalledTimes(1);
});

test("UM3. 곧 끝남 — 남은 날 · 끝 날 · N of M days · 막대 10% · Keep unlimited · Manage 링크", () => {
  const { onKeepUnlimited, onManageSubscription } = renderModal({
    kind: "ending-soon",
    on: { year: 2026, month: 11, day: 12 },
    daysLeft: 3,
    totalDays: 30,
    remaining: 0.1,
    planLabel: null,
  });

  none("plan");
  expect(id("days-left")).toHaveTextContent("3 days left");
  expect(id("period-label")).toHaveTextContent("Ends Nov 12");
  expect(id("day-progress")).toHaveTextContent("3 of 30 days");
  expect(id("track-fill").getAttribute("style")).toContain("10%");
  expect(id("message")).toHaveTextContent("After that, lessons use tickets again.");
  fireEvent.tap(id("keep"));
  expect(onKeepUnlimited).toHaveBeenCalledTimes(1);
  fireEvent.tap(id("manage"));
  expect(onManageSubscription).toHaveBeenCalledTimes(1);
});

test("UM4. 갱신 꺼짐(7일 넘게 남음) — Ends on · 날짜, 요금제 이름이 없으면 알약 없음", () => {
  renderModal({ kind: "ends", on: { year: 2026, month: 11, day: 19 }, planLabel: null });

  none("plan");
  expect(id("period-label")).toHaveTextContent("Ends on");
  expect(id("period-date")).toHaveTextContent("Nov 19, 2026");
  none("days-left");
  expect(id("manage")).toBeInTheDocument();
});

test("UM5. 뒤로 버튼 · 시스템 뒤로가기가 닫는다", () => {
  const { onClose } = renderModal({ kind: "guest" });
  const back = id("back").querySelector('[data-testid="ui-lynx-round-button"]');
  expect(back).not.toBeNull();
  fireEvent.tap(back as Element);
  expect(onClose).toHaveBeenCalledTimes(1);
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(2);
});

test("UM6. 기간 카드는 한 문장으로 낭독된다", () => {
  renderModal({
    kind: "ending-soon",
    on: { year: 2026, month: 11, day: 12 },
    daysLeft: 3,
    totalDays: 30,
    remaining: 0.1,
    planLabel: null,
  });
  expect(id("period").getAttribute("accessibility-label")).toBe(
    "3 days left. Ends Nov 12. 3 of 30 days",
  );
});
