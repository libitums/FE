// 학습 티켓의 앱 쪽 상태입니다 — 원장(진행 훅이 저장 · 병합)을 읽어 지금 장수를 내고, 새 레슨의 문지기 ·
// 머리 모달(E1) · 티켓 없음 대화상자(E6m) · 「Get more tickets」를 묶습니다. 시각은 기기 시계입니다.
//
// 다시 그리는 때: 모달이나 대화상자가 떠 있으면 1초마다(카운트다운), 아니면 다음 한 장이 차는 순간 한 번(칩 숫자).

import { useEffect, useRef, useState } from "@lynx-js/react";

import { grantFreeTicket, ticketStatusAt } from "../lib/learning-tickets";
import type { TicketLedger, TicketStatus } from "../lib/learning-tickets";
import { localDayFrom } from "../lib/progress-api";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { TicketMoreResult, TicketSurface } from "../screens/tickets/tickets.contract";
import { createTicketStart } from "./ticket-gate";
import type { TicketStart } from "./ticket-gate";

export type TicketHeaderWiring = {
  readonly status: TicketStatus;
  readonly more: TicketMoreResult;
  readonly onGetMore: () => void;
  /** 머리가 티켓 모달을 열고 닫을 때 알립니다 — 떠 있는 동안 1초마다 다시 그립니다. */
  readonly onModalChange: (open: boolean) => void;
};

export type OutOfTicketsWiring = {
  readonly status: TicketStatus;
  readonly more: TicketMoreResult;
  readonly onGetMore: () => void;
  readonly onStartLesson: () => void;
  readonly onClose: () => void;
};

export type LearningTickets = {
  readonly status: TicketStatus;
  readonly startWithTicket: TicketStart;
  readonly header: TicketHeaderWiring;
  /** 막힌 새 레슨이 있으면 대화상자 결선, 없으면 `null`입니다. */
  readonly outOfTickets: OutOfTicketsWiring | null;
};

type Blocked = { readonly open: () => void; readonly more: TicketMoreResult };

export function useLearningTickets(
  tickets: TicketLedger,
  setTickets: (next: TicketLedger) => void,
  eventSink: EpisodeIntroEventSink,
): LearningTickets {
  // 결선 함수가 옛 렌더의 원장을 쥐지 않게 늘 최신 원장을 ref로 읽습니다.
  const ledger = useRef(tickets);
  ledger.current = tickets;
  const [, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMore, setModalMore] = useState<TicketMoreResult>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const status = ticketStatusAt(tickets, Date.now());
  const ticking = modalOpen || blocked !== null;

  useEffect(() => {
    const delay = ticking ? 1_000 : status.nextInMs === null ? null : status.nextInMs + 50;
    if (delay === null) return;
    const timer = setTimeout(() => setTick((value) => value + 1), delay);
    return () => clearTimeout(timer);
  });

  const write = (next: TicketLedger): void => {
    ledger.current = next;
    setTickets(next);
  };

  const getMore = (surface: TicketSurface): TicketMoreResult => {
    "background only";
    const granted = grantFreeTicket(ledger.current, Date.now(), localDayFrom(new Date()));
    if (granted !== null) write(granted);
    eventSink?.({ name: "ticket_more_tapped", surface, granted: granted !== null });
    return { granted: granted !== null };
  };

  const startWithTicket = createTicketStart({
    ledger: () => ledger.current,
    setLedger: write,
    now: () => Date.now(),
    onOutOfTickets: (open) => {
      eventSink?.({ name: "tickets_ran_out" });
      setBlocked({ open, more: null });
    },
  });

  return {
    status,
    startWithTicket,
    header: {
      status,
      more: modalMore,
      onGetMore: () => setModalMore(getMore("ticket_modal")),
      onModalChange: (open) => {
        setModalOpen(open);
        if (!open) setModalMore(null);
      },
    },
    outOfTickets:
      blocked === null
        ? null
        : {
            status,
            more: blocked.more,
            onGetMore: () => {
              const more = getMore("out_of_tickets");
              setBlocked((current) => (current === null ? null : { ...current, more }));
            },
            onStartLesson: () => {
              const open = blocked.open;
              setBlocked(null);
              startWithTicket(false, open);
            },
            onClose: () => setBlocked(null),
          },
  };
}
