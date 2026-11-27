import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AdTicketState } from "../../lib/ad-ticket.contract";
import { backHandlers } from "../../lib/back-handler";
import {
  addBoughtTicket,
  fullTicketLedger,
  spendTicket,
  ticketStatusAt,
} from "../../lib/learning-tickets";
import type { TicketLedger } from "../../lib/learning-tickets";
import { OutOfTicketsDialog } from "./OutOfTicketsDialog";

// `ui` 계층: 「Out of tickets」의 광고 줄(ADR-0208, 시안 A1 ~ A5).

const T0 = 1_800_000_000_000;
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

function renderDialog(state: AdTicketState | null, ledger: TicketLedger = empty) {
  const onWatch = vi.fn();
  const handlers = { onGetMore: vi.fn(), onStartLesson: vi.fn(), onClose: vi.fn() };
  render(
    <OutOfTicketsDialog
      status={ticketStatusAt(ledger, T0)}
      more={null}
      {...handlers}
      adTicket={state === null ? undefined : { state, onWatch }}
    />,
  );
  return { onWatch, ...handlers };
}

const busy = (step: "starting" | "loading" | "showing" | "confirming"): AdTicketState => ({
  kind: "busy",
  step,
  left: 2,
  cap: 2,
  requestId: "r",
  polls: 0,
});

test("[UAT1] A1 — 광고 줄이 엽전 버튼 위에: Watch a short ad · +1 ticket · 2 left today · Free, 누르면 onWatch", () => {
  const { onWatch } = renderDialog({ kind: "offer", left: 2, cap: 2, failed: false });
  const row = screen.getByTestId("out-of-tickets-ad");
  expect(row).toHaveTextContent("Watch a short ad");
  expect(row).toHaveTextContent("+1 ticket · 2 left today");
  expect(row).toHaveTextContent("Free");
  expect(row.getAttribute("accessibility-label")).toBe(
    "Watch a short ad for 1 free ticket. 2 left today.",
  );
  expect(row.getAttribute("data-state")).toBe("offer");
  fireEvent.tap(row);
  expect(onWatch).toHaveBeenCalledTimes(1);
  // 광고 줄은 엽전 버튼보다 앞에 섭니다(시안 순서: 광고 → 엽전 20 → Go unlimited).
  const container = screen.getByTestId("out-of-tickets");
  const html = container.innerHTML;
  expect(html.indexOf("out-of-tickets-ad")).toBeLessThan(html.indexOf("out-of-tickets-more"));
});

test("[UAT2] 광고 결선이 없거나 hidden이면 줄이 없다 — 지금 대화상자 그대로", () => {
  renderDialog(null);
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  cleanup();
  renderDialog({ kind: "hidden" });
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  expect(screen.getByTestId("out-of-tickets-more")).toBeInTheDocument();
});

test("[UAT3] A2 — 불러오는 중은 줄 안에서만, 누르지 않는다 · 확인 중 문구", () => {
  const { onWatch } = renderDialog(busy("loading"));
  const row = screen.getByTestId("out-of-tickets-ad");
  expect(row).toHaveTextContent("Loading ad…");
  expect(row).toHaveTextContent("This takes a few seconds");
  expect(row.getAttribute("data-state")).toBe("busy");
  fireEvent.tap(row);
  expect(onWatch).not.toHaveBeenCalled();
  expect(screen.getByTestId("out-of-tickets-more")).toBeInTheDocument();
  cleanup();
  renderDialog(busy("confirming"));
  expect(screen.getByTestId("out-of-tickets-ad")).toHaveTextContent("Getting your ticket…");
});

test("[UAT4] A3 — 받음: 제목 You got a ticket · 안내 · Start lesson 주 버튼, 광고 줄 없음", () => {
  const { onStartLesson } = renderDialog(
    { kind: "granted", left: 1 },
    addBoughtTicket(empty, T0) as TicketLedger,
  );
  expect(screen.getByTestId("out-of-tickets")).toHaveTextContent("You got a ticket");
  expect(screen.getByTestId("out-of-tickets-clock")).toHaveTextContent("1ticket ready");
  expect(screen.getByTestId("out-of-tickets-ad-granted")).toHaveTextContent(
    "Thanks for watching. 1 ad ticket left today.",
  );
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("out-of-tickets-start"));
  expect(onStartLesson).toHaveBeenCalledTimes(1);
});

test("[UAT5] A4 — 오늘 다 씀: 흐리게 · Used 2 of 2 today · back tomorrow · 누르지 않는다", () => {
  const { onWatch } = renderDialog({ kind: "limit", cap: 2 });
  const row = screen.getByTestId("out-of-tickets-ad");
  expect(row.getAttribute("data-state")).toBe("limit");
  expect(row).toHaveTextContent("Used 2 of 2 today · back tomorrow");
  expect(row.getAttribute("accessibility-traits")).toBe("disabled");
  fireEvent.tap(row);
  expect(onWatch).not.toHaveBeenCalled();
});

test("[UAT6] A5 — 광고 없음: 줄 대신 안내 한 줄", () => {
  renderDialog({ kind: "no-fill", left: 2, cap: 2, retryAtMs: T0 });
  expect(screen.queryByTestId("out-of-tickets-ad")).not.toBeInTheDocument();
  expect(screen.getByTestId("out-of-tickets-ad-notice")).toHaveTextContent(
    "No ad is available right now. Try again in a little while.",
  );
});

test("[UAT7] 실패 뒤 offer — 줄 위에 실패 안내, 다시 누를 수 있다", () => {
  const { onWatch } = renderDialog({ kind: "offer", left: 1, cap: 2, failed: true });
  expect(screen.getByTestId("out-of-tickets-ad-notice")).toHaveTextContent(
    "Couldn't get your ticket. Please try again.",
  );
  fireEvent.tap(screen.getByTestId("out-of-tickets-ad"));
  expect(onWatch).toHaveBeenCalledTimes(1);
});
