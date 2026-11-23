import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { fullTicketLedger, spendTicket } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import type { TicketPurchase } from "../lib/ticket-purchase-api";
import { useLearningTickets } from "./use-learning-tickets";

// `ui` 계층: 「Get 1 ticket」의 잠금(리뷰 #562) — 흐름이 던져도 「사는 중」에 갇히지 않고 실패 안내 뒤 다시 누를 수 있다.

afterEach(cleanup);

const used = spendTicket(fullTicketLedger, Date.now()) as TicketLedger;

function Harness({
  buy,
}: {
  readonly buy: (requestId: string) => Promise<TicketPurchase | "signed-out" | null>;
}) {
  const tickets = useLearningTickets(used, () => {}, null, { chipShown: false, buy });
  return (
    <view
      data-testid="more"
      data-kind={tickets.header.more?.kind ?? "none"}
      bindtap={tickets.header.onGetMore}
    />
  );
}

test("UT1. 사는 일이 던지면 failed로 끝나고 다시 누르면 또 산다", async () => {
  const buy = vi.fn<(requestId: string) => Promise<TicketPurchase | "signed-out" | null>>(() => {
    throw new Error("boom");
  });
  render(<Harness buy={buy} />);
  fireEvent.tap(screen.getByTestId("more"), {});
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId("more")).toHaveAttribute("data-kind", "failed");
  fireEvent.tap(screen.getByTestId("more"), {});
  await act(async () => {
    await Promise.resolve();
  });
  expect(buy).toHaveBeenCalledTimes(2);
});
