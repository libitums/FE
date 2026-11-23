// 「Get 1 ticket」 한 번의 흐름입니다(사용자 결정 2026-11-23 — 엽전 20으로 1장, 하루 한 장 무료를 갈음).
// 가득이면 서버를 부르지 않습니다. 서버(`companion_buy_ticket`)가 엽전을 뺀 뒤에만 원장에 1장을 더하고, 돌려받은 잔액을
// 머리 엽전 칩에 알립니다. 원장 · 시각 · 서버 · 칩 알림은 모두 받아 씁니다 — 순수에 가깝게 두어 단위 테스트로 봅니다.

import { addBoughtTicket, ticketPriceCoins } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";
import type { TicketPurchase } from "../lib/ticket-purchase-api";
import type { TicketMoreOutcome, TicketMoreResult } from "../screens/tickets/tickets.contract";

export type TicketPurchaseFlowDeps = {
  readonly ledger: () => TicketLedger;
  readonly write: (next: TicketLedger) => void;
  readonly now: () => number;
  readonly buy: (requestId: string) => Promise<TicketPurchase | "signed-out" | null>;
  readonly onBalance: (balance: number) => void;
  readonly requestId: () => string;
};

export type TicketPurchaseFlowResult = {
  readonly more: Exclude<TicketMoreResult, null | { readonly kind: "buying" }>;
  readonly outcome: TicketMoreOutcome;
  /** 서버가 돌려준 값 — 모르면 앱 기본값입니다. */
  readonly price: number;
};

export async function buyOneTicket(
  deps: TicketPurchaseFlowDeps,
): Promise<TicketPurchaseFlowResult> {
  if (addBoughtTicket(deps.ledger(), deps.now()) === null) {
    return { more: { kind: "full" }, outcome: "full", price: ticketPriceCoins };
  }
  const reply = await deps.buy(deps.requestId());
  if (reply === "signed-out") {
    return { more: { kind: "sign-in" }, outcome: "sign_in", price: ticketPriceCoins };
  }
  if (reply === null)
    return { more: { kind: "failed" }, outcome: "failed", price: ticketPriceCoins };
  if (reply.balance !== null) deps.onBalance(reply.balance);
  if (reply.result === "short") {
    return {
      more: { kind: "short", shortBy: reply.shortBy ?? reply.price },
      outcome: "short",
      price: reply.price,
    };
  }
  // 샀습니다(또는 같은 요청을 다시 보내 이미 샀습니다). 기다리는 사이 시간이 흘러 가득이 됐으면 더할 칸이 없습니다.
  const next = addBoughtTicket(deps.ledger(), deps.now());
  if (next !== null) deps.write(next);
  return { more: { kind: "bought" }, outcome: "bought", price: reply.price };
}
