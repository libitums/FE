import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { fullTicketLedger, ticketStatusAt } from "../../lib/learning-tickets";
import { TicketStatModal } from "./TicketStatModal";

// `ui` 계층(TG1 ~ TG2, ADR-0160 · 시안 T1b): 티켓 모달의 「∞ Go unlimited · 가격/mo」 줄 — 카운트다운과 칸 사이.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

const status = ticketStatusAt(fullTicketLedger, 1_800_000_000_000);

test("TG1 줄이 가격과 함께 칸 위에 서고, 누르면 onGoUnlimited", () => {
  const onGoUnlimited = vi.fn<() => void>();
  render(
    <TicketStatModal
      status={status}
      more={null}
      onGetMore={() => {}}
      onClose={() => {}}
      goUnlimited={{ price: "$3.99", onPress: onGoUnlimited }}
    />,
  );
  const row = screen.getByTestId("ticket-modal-go-unlimited");
  expect(row).toHaveTextContent("Go unlimited · $3.99/mo");
  expect(row.getAttribute("accessibility-traits")).toBe("button");
  const slots = screen.getByTestId("ticket-modal-slots");
  expect(row.compareDocumentPosition(slots) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.tap(row, {});
  expect(onGoUnlimited).toHaveBeenCalledTimes(1);
});

test("TG2 결선이 없으면 줄이 없다(지금 그대로)", () => {
  render(<TicketStatModal status={status} more={null} onGetMore={() => {}} onClose={() => {}} />);
  expect(screen.queryByTestId("ticket-modal-go-unlimited")).toBeNull();
});
