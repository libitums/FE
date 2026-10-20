// 새 레슨의 문지기입니다 — 다시 하기는 그냥 열고, 새 레슨은 티켓 한 장을 쓰고 엽니다. 남은 장이 없으면 열지 않고
// 막혔다고 알립니다(대화상자는 부르는 쪽이 띄웁니다). 시각은 매번 `now()`로 읽습니다.

import { spendTicket } from "../lib/learning-tickets";
import type { TicketLedger } from "../lib/learning-tickets";

/** `isReplay`가 참이면 티켓 없이 엽니다. */
export type TicketStart = (isReplay: boolean, open: () => void) => void;

export type TicketGateDeps = {
  readonly ledger: () => TicketLedger;
  readonly setLedger: (next: TicketLedger) => void;
  readonly now: () => number;
  /** 남은 장이 없어 막혔을 때입니다. 막힌 시작(`open`)을 넘깁니다 — 나중에 한 장이 생기면 그대로 엽니다. */
  readonly onOutOfTickets: (open: () => void) => void;
};

export function createTicketStart(deps: TicketGateDeps): TicketStart {
  return (isReplay, open) => {
    if (isReplay) {
      open();
      return;
    }
    const next = spendTicket(deps.ledger(), deps.now());
    if (next === null) {
      deps.onOutOfTickets(open);
      return;
    }
    deps.setLedger(next);
    open();
  };
}
