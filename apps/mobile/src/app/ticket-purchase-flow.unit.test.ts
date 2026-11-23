import { describe, expect, test, vi } from "vitest";

import { fullTicketLedger, spendTicket, ticketStatusAt } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import type { TicketPurchase } from "../lib/ticket-purchase-api";
import { buyOneTicket } from "./ticket-purchase-flow";

// `unit` 계층: 「Get 1 ticket」 한 번의 흐름(사용자 결정 2026-11-23) — 가득이면 서버를 부르지 않고, 산 뒤에만 원장에 1장.

const T0 = 1_800_000_000_000;
const used = spendTicket(fullTicketLedger, T0) as TicketLedger;

function run(start: TicketLedger, reply: TicketPurchase | "signed-out" | null) {
  let ledger = start;
  const buy = vi.fn<(requestId: string) => Promise<TicketPurchase | "signed-out" | null>>(
    async () => reply,
  );
  const onBalance = vi.fn<(balance: number) => void>();
  const result = buyOneTicket({
    ledger: () => ledger,
    write: (next) => {
      ledger = next;
    },
    now: () => T0,
    buy,
    onBalance,
    requestId: () => "req-1",
  });
  return { result, buy, onBalance, ledger: () => ledger };
}

const reply = (over: Partial<TicketPurchase>): TicketPurchase => ({
  result: "bought",
  price: 20,
  shortBy: null,
  balance: 80,
  ...over,
});

describe("buyOneTicket", () => {
  test("TF1. 샀으면 원장에 1장 · 잔액을 칩에 · bought", async () => {
    const flow = run(used, reply({}));
    expect(await flow.result).toEqual({ more: { kind: "bought" }, outcome: "bought", price: 20 });
    expect(flow.buy).toHaveBeenCalledExactlyOnceWith("req-1");
    expect(ticketStatusAt(flow.ledger(), T0).available).toBe(3);
    expect(flow.onBalance).toHaveBeenCalledExactlyOnceWith(80);
  });

  test("TF2. already(같은 요청을 다시 보냄)도 산 것으로 1장", async () => {
    const flow = run(used, reply({ result: "already" }));
    expect((await flow.result).outcome).toBe("bought");
    expect(ticketStatusAt(flow.ledger(), T0).available).toBe(3);
  });

  test("TF3. 가득이면 서버를 부르지 않고 full", async () => {
    const flow = run(fullTicketLedger, reply({}));
    expect(await flow.result).toEqual({ more: { kind: "full" }, outcome: "full", price: 20 });
    expect(flow.buy).not.toHaveBeenCalled();
  });

  test("TF4. 모자라면 원장 그대로 · short와 모자란 수 · 잔액은 칩에", async () => {
    const flow = run(used, reply({ result: "short", shortBy: 8, balance: 12 }));
    expect(await flow.result).toEqual({
      more: { kind: "short", shortBy: 8 },
      outcome: "short",
      price: 20,
    });
    expect(flow.ledger()).toBe(used);
    expect(flow.onBalance).toHaveBeenCalledExactlyOnceWith(12);
  });

  test("TF5. 로그인이 없으면 sign-in, 실패면 failed — 원장 그대로", async () => {
    const out = run(used, "signed-out");
    expect(await out.result).toEqual({ more: { kind: "sign-in" }, outcome: "sign_in", price: 20 });
    const failed = run(used, null);
    expect(await failed.result).toEqual({ more: { kind: "failed" }, outcome: "failed", price: 20 });
    expect(failed.ledger()).toBe(used);
  });

  test("TF6. 서버가 다른 값을 돌려주면 그 값을 싣는다", async () => {
    const flow = run(used, reply({ price: 30 }));
    expect((await flow.result).price).toBe(30);
  });
});
