import { describe, expect, test, vi } from "vitest";

import { fullTicketLedger, spendTicket, ticketStatusAt } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import { createTicketStart } from "./ticket-gate";

// `unit` 계층: 새 레슨의 문지기 — 다시 하기는 무료, 새 레슨은 1장, 0장이면 막음.

const T0 = 1_800_000_000_000;

function gate(initial: TicketLedger) {
  let ledger = initial;
  const onOutOfTickets = vi.fn();
  const start = createTicketStart({
    ledger: () => ledger,
    setLedger: (next) => {
      ledger = next;
    },
    now: () => T0,
    onOutOfTickets,
  });
  return { start, onOutOfTickets, available: () => ticketStatusAt(ledger, T0).available };
}

const empty = [0, 0, 0].reduce<TicketLedger>(
  (ledger) => spendTicket(ledger, T0) as TicketLedger,
  fullTicketLedger,
);

describe("createTicketStart", () => {
  test("TG1. 새 레슨은 1장을 쓰고 연다", () => {
    const g = gate(fullTicketLedger);
    const open = vi.fn();
    g.start(false, open);
    expect(open).toHaveBeenCalledTimes(1);
    expect(g.available()).toBe(2);
    expect(g.onOutOfTickets).not.toHaveBeenCalled();
  });

  test("TG2. 다시 하기는 쓰지 않고 연다 — 0장이어도", () => {
    const g = gate(empty);
    const open = vi.fn();
    g.start(true, open);
    expect(open).toHaveBeenCalledTimes(1);
    expect(g.available()).toBe(0);
    expect(g.onOutOfTickets).not.toHaveBeenCalled();
  });

  test("TG3. 0장에서 새 레슨은 열지 않고 막힌 시작을 넘긴다", () => {
    const g = gate(empty);
    const open = vi.fn();
    g.start(false, open);
    expect(open).not.toHaveBeenCalled();
    expect(g.onOutOfTickets).toHaveBeenCalledTimes(1);
    expect(g.onOutOfTickets).toHaveBeenCalledWith(open);
  });

  test("TG4. onSpent가 있으면 한 장을 쓰고, 쓰기 전 장수와 시작을 넘기며 바로 열지 않는다", () => {
    let ledger = fullTicketLedger;
    const onSpent = vi.fn();
    const start = createTicketStart({
      ledger: () => ledger,
      setLedger: (next) => {
        ledger = next;
      },
      now: () => T0,
      onOutOfTickets: vi.fn(),
      onSpent,
    });
    const open = vi.fn();
    start(false, open);
    expect(ticketStatusAt(ledger, T0).available).toBe(2);
    expect(open).not.toHaveBeenCalled();
    expect(onSpent).toHaveBeenCalledWith(3, open);
  });

  test("TG5. onSpent가 있어도 다시 하기 · 0장은 부르지 않는다", () => {
    const onSpent = vi.fn();
    const onOutOfTickets = vi.fn();
    const start = createTicketStart({
      ledger: () => empty,
      setLedger: vi.fn(),
      now: () => T0,
      onOutOfTickets,
      onSpent,
    });
    const replay = vi.fn();
    start(true, replay);
    start(false, vi.fn());
    expect(replay).toHaveBeenCalledTimes(1);
    expect(onOutOfTickets).toHaveBeenCalledTimes(1);
    expect(onSpent).not.toHaveBeenCalled();
  });
});
