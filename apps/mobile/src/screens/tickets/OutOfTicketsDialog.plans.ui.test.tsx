import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { fullTicketLedger, spendTicket, ticketStatusAt } from "../../lib/learning-tickets";
import type { TicketLedger } from "../../lib/learning-tickets";
import type { PlanId } from "../../lib/plans-api";
import { planCardsFor } from "../plans/plans-model";
import { plansTestIds as ids } from "../plans/plans.contract";
import { catalogV1 } from "../plans/plans.test-support";
import { OutOfTicketsDialog } from "./OutOfTicketsDialog";

// `ui` 계층(SB-UI4): 티켓 다 씀 대화상자의 무제한 티켓 카드(ADR-0144, 시안 ①) — 결선이 있을 때만.

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

function mount(withOffer: boolean) {
  const offer = {
    cards: planCardsFor(catalogV1, "tickets", "monthly", null),
    onSelect: vi.fn<(plan: PlanId) => void>(),
    onCompare: vi.fn<() => void>(),
    onShown: vi.fn<() => void>(),
  };
  render(
    <OutOfTicketsDialog
      status={ticketStatusAt(empty, T0)}
      more={null}
      onGetMore={() => {}}
      onStartLesson={() => {}}
      onClose={() => {}}
      {...(withOffer ? { offer } : {})}
    />,
  );
  return offer;
}

const before = (a: Element, b: Element): boolean => (a.compareDocumentPosition(b) & 4) !== 0;

test("SB-UI4a 결선이 있으면 카드 + Go unlimited가 대화상자 동작 맨 앞, Compare plans가 바로 뒤", () => {
  const offer = mount(true);
  const go = screen.getByTestId(ids.offerGo);
  expect(screen.getByTestId("out-of-tickets")).toHaveTextContent("Unlimited Tickets");
  expect(before(go, screen.getByTestId(ids.offerCompare))).toBe(true);
  expect(before(go, screen.getByTestId("out-of-tickets-back"))).toBe(true);
  fireEvent.tap(go, {});
  expect(offer.onSelect).toHaveBeenCalledWith("unlimited_tickets");
  expect(offer.onShown).toHaveBeenCalledTimes(1);
});

test("SB-UI4b 결선이 없으면 지금 그대로 — 카드 · Go unlimited 없음", () => {
  mount(false);
  expect(screen.queryByTestId(ids.offer)).toBeNull();
  expect(screen.queryByTestId(ids.offerGo)).toBeNull();
  expect(screen.getByTestId("out-of-tickets-back")).toBeInTheDocument();
});
