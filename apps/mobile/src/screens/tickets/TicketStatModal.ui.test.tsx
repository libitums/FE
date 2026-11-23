import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { fullTicketLedger, spendTicket, ticketStatusAt } from "../../lib/learning-tickets";
import type { TicketLedger } from "../../lib/learning-tickets";
import { TicketStatModal } from "./TicketStatModal";
import type { TicketMoreResult } from "./tickets.contract";

// `ui` 계층: 머리 티켓 칩을 누르면 뜨는 전체 화면 모달(시안 E1).

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const used = spendTicket(fullTicketLedger, T0) as TicketLedger;

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function renderModal(ledger: TicketLedger, nowMs: number, more: TicketMoreResult = null) {
  const onGetMore = vi.fn();
  const onClose = vi.fn();
  render(
    <TicketStatModal
      status={ticketStatusAt(ledger, nowMs)}
      more={more}
      onGetMore={onGetMore}
      onClose={onClose}
    />,
  );
  return { onGetMore, onClose };
}

test("[TM1] 2장 · 18분 지남 — 숫자 2, 알약 0:42:00, 칸 [충전 중 30%, 찬, 찬], 칸 아래 0:42 · Ready", () => {
  renderModal(used, T0 + 18 * MIN);
  expect(screen.getByTestId("ticket-modal-value")).toHaveTextContent("2");
  expect(screen.getByTestId("ticket-modal-title")).toHaveTextContent("tickets left");
  expect(screen.getByTestId("ticket-modal-next")).toHaveTextContent("Next ticket in 0:42:00");
  expect(screen.getByTestId("ticket-modal-slot-0").getAttribute("data-kind")).toBe("charging");
  expect(screen.getByTestId("ticket-modal-slot-fill-0").getAttribute("style")).toContain("30%");
  expect(screen.getByTestId("ticket-modal-slot-1").getAttribute("data-kind")).toBe("ready");
  expect(screen.getByTestId("ticket-modal-slot-2").getAttribute("data-kind")).toBe("ready");
  expect(screen.getByTestId("ticket-modal-slot-time-0")).toHaveTextContent("0:42");
  expect(screen.getByTestId("ticket-modal-slot-time-1")).toHaveTextContent("Ready");
});

test("[TM2] 가득이면 알약이 없고 칸 셋이 모두 Ready", () => {
  renderModal(fullTicketLedger, T0);
  expect(screen.getByTestId("ticket-modal-value")).toHaveTextContent("3");
  expect(screen.queryByTestId("ticket-modal-next")).not.toBeInTheDocument();
  for (const i of [0, 1, 2]) {
    expect(screen.getByTestId(`ticket-modal-slot-${String(i)}`).getAttribute("data-kind")).toBe(
      "ready",
    );
  }
});

test("[TM3] 1장이면 제목이 단수", () => {
  const twice = spendTicket(used, T0) as TicketLedger;
  renderModal(twice, T0);
  expect(screen.getByTestId("ticket-modal-title")).toHaveTextContent("ticket left");
  expect(screen.getByTestId("ticket-modal-title")).not.toHaveTextContent("tickets");
});

// 엽전으로 1장 사기(사용자 결정 2026-11-23) — 버튼에 값(엽전 20)이 서고, 결과마다 안내 한 줄입니다.
test("[TM4] 버튼은 「Get 1 ticket」 + 엽전 20, 누르면 onGetMore", () => {
  const { onGetMore } = renderModal(used, T0);
  const button = screen.getByTestId("ticket-modal-more");
  expect(button).toHaveAttribute("accessibility-label", "Get 1 ticket for 20 coins");
  expect(button).toHaveTextContent("Get 1 ticket");
  expect(screen.getByTestId("ticket-modal-more-price")).toHaveTextContent("20");
  expect(screen.queryByTestId("ticket-modal-more-notice")).not.toBeInTheDocument();
  fireEvent.tap(button);
  expect(onGetMore).toHaveBeenCalledTimes(1);
});

test.each([
  [{ kind: "bought" }, "1 ticket added."],
  [{ kind: "short", shortBy: 8 }, "Not enough coins. You need 8 more."],
  [{ kind: "full" }, "Your tickets are already full."],
  [{ kind: "sign-in" }, "Sign in to use coins."],
  [{ kind: "failed" }, "Couldn't get a ticket. Please try again."],
] as const)("[TM4b] 결과 %o → 안내 「%s」", (more, notice) => {
  renderModal(used, T0, more);
  expect(screen.getByTestId("ticket-modal-more-notice")).toHaveTextContent(notice);
});

test("[TM4c] 사는 중에는 버튼이 눌리지 않고 안내가 없다 — 두 번 빠지지 않게", () => {
  const { onGetMore } = renderModal(used, T0, { kind: "buying" });
  const button = screen.getByTestId("ticket-modal-more");
  expect(button).toHaveAttribute("data-busy", "true");
  fireEvent.tap(button);
  expect(onGetMore).not.toHaveBeenCalled();
  expect(screen.queryByTestId("ticket-modal-more-notice")).not.toBeInTheDocument();
});

test("[TM5] 뒤로 버튼 · 시스템 뒤로가기가 닫는다", () => {
  const { onClose } = renderModal(used, T0);
  const back = screen
    .getByTestId("ticket-modal-back")
    .querySelector('[data-testid="ui-lynx-round-button"]');
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

test("[TM6] 칸 줄은 한 문장으로 낭독된다", () => {
  renderModal(used, T0 + 18 * MIN);
  expect(screen.getByTestId("ticket-modal-slots").getAttribute("accessibility-label")).toBe(
    "2 of 3 tickets ready. Next ticket in 0:42:00",
  );
});
