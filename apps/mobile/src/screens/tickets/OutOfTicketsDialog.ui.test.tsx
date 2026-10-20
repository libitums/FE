import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import {
  fullTicketLedger,
  grantFreeTicket,
  spendTicket,
  ticketStatusAt,
} from "../../lib/learning-tickets";
import type { TicketLedger } from "../../lib/learning-tickets";
import { OutOfTicketsDialog } from "./OutOfTicketsDialog";

// `ui` 계층: 티켓 0에서 새 레슨을 열려 할 때 뜨는 가운데 대화상자(시안 E6m).

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const empty = [0, 0, 0].reduce<TicketLedger>(
  (ledger) => spendTicket(ledger, T0) as TicketLedger,
  fullTicketLedger,
);

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

function renderDialog(
  ledger: TicketLedger,
  nowMs: number,
  more = null as { granted: boolean } | null,
) {
  const handlers = { onGetMore: vi.fn(), onStartLesson: vi.fn(), onClose: vi.fn() };
  render(<OutOfTicketsDialog status={ticketStatusAt(ledger, nowMs)} more={more} {...handlers} />);
  return handlers;
}

test("[OT1] 0장 · 18분 지남 — 제목, 원형 카운트다운 0:42, Start lesson 없음", () => {
  renderDialog(empty, T0 + 18 * MIN);
  expect(screen.getByTestId("out-of-tickets")).toHaveTextContent("Out of tickets");
  expect(screen.getByTestId("out-of-tickets-clock")).toHaveTextContent("0:42");
  expect(screen.getByTestId("out-of-tickets-clock").getAttribute("accessibility-label")).toBe(
    "0:42 until your next ticket",
  );
  expect(screen.queryByTestId("out-of-tickets-start")).not.toBeInTheDocument();
});

test("[OT2] Back to map · 시스템 뒤로가기가 닫는다", () => {
  const { onClose } = renderDialog(empty, T0);
  fireEvent.tap(screen.getByTestId("out-of-tickets-back"));
  expect(onClose).toHaveBeenCalledTimes(1);
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(2);
});

test("[OT3] Get more → onGetMore, 받았으면 안내 + Start lesson이 Get more 자리에", () => {
  const { onGetMore } = renderDialog(empty, T0);
  fireEvent.tap(screen.getByTestId("out-of-tickets-more"));
  expect(onGetMore).toHaveBeenCalledTimes(1);
  cleanup();
  const granted = grantFreeTicket(empty, T0, "2027-01-15") as TicketLedger;
  const after = renderDialog(granted, T0, { granted: true });
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent("free ticket");
  expect(screen.queryByTestId("out-of-tickets-more")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("out-of-tickets-start"));
  expect(after.onStartLesson).toHaveBeenCalledTimes(1);
});

test("[OT4] 받지 못했으면 안내만 서고 Start lesson은 없다", () => {
  renderDialog(empty, T0, { granted: false });
  expect(screen.getByTestId("out-of-tickets-more-notice")).toHaveTextContent(
    "More ways to get tickets are coming soon.",
  );
  expect(screen.queryByTestId("out-of-tickets-start")).not.toBeInTheDocument();
});

test("[OT5] 원 둘레 칸 셋 — 충전 중 칸의 진행률이 그림에 실린다", () => {
  renderDialog(empty, T0 + 18 * MIN);
  const ring = screen.getByTestId("out-of-tickets-ring");
  expect(ring.getAttribute("data-progress")).toBe("0.3");
});
