// 학습 티켓의 앱 쪽 상태입니다 — 원장(진행 훅이 저장 · 병합)을 읽어 지금 장수를 내고, 새 레슨의 문지기 ·
// 머리 모달(E1) · 티켓 없음 대화상자(E6m) · 「Get more tickets」를 묶습니다. 시각은 기기 시계입니다.
//
// 다시 그리는 때: 모달이나 대화상자가 떠 있으면 1초마다(카운트다운), 아니면 다음 한 장이 차는 순간 한 번(칩 숫자).
//
// 머리 칩이 보이는 화면(`chipShown`)에서 새 레슨에 한 장을 쓰면 바로 열지 않습니다 — 칩이 줄어드는 것(시안 E4)을
// 보인 뒤 엽니다. 칩이 끝을 알리지 못해도(그 사이 머리가 내려가는 등) 안전망 타이머가 엽니다. 기다리는 동안의 새
// 시작은 무시합니다 — 한 장을 두 번 쓰거나 레슨을 두 번 열지 않게.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";

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
  /** 방금 쓰기 전 장수입니다(시안 E4) — 칩이 줄어드는 동안만 있고, 아니면 `null`입니다. */
  readonly dropFrom: number | null;
  /** 칩이 줄어듦을 마치면 부릅니다. 기다리던 레슨을 엽니다. */
  readonly onDropped: () => void;
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
type Dropping = { readonly from: number; readonly open: () => void };

/** 칩이 끝을 알리지 못해도 여는 시각입니다 — 가장 긴 재생(`d8`)에 여유(`d4`)를 더합니다. */
export const ticketDropFallbackMs =
  motionDurationMs(motionTokens.duration.d8) + motionDurationMs(motionTokens.duration.d4);

// 줄어듦을 기다리는가입니다. 줄어듦이 주제가 아닌 통합 테스트는 실제 타이머로 Start 직후 학습을 찾으므로, 테스트
// 설정(`vitest.setup.ts`)이 끄고 티켓 테스트만 켭니다. 앱에서는 늘 켜져 있습니다.
let dropWaitEnabled = true;

/** 테스트만 부릅니다 — 줄어듦을 기다리지 않고 바로 열지(`false`) 정합니다. */
export function setTicketDropWaitForTests(enabled: boolean): void {
  dropWaitEnabled = enabled;
}

export type LearningTicketsOptions = {
  /** 머리 칩이 화면에 서 있는가입니다(탭 루트). 거짓이면 쓴 뒤 바로 엽니다. */
  readonly chipShown: boolean;
};

export function useLearningTickets(
  tickets: TicketLedger,
  setTickets: (next: TicketLedger) => void,
  eventSink: EpisodeIntroEventSink,
  options: LearningTicketsOptions = { chipShown: false },
): LearningTickets {
  // 결선 함수가 옛 렌더의 원장을 쥐지 않게 늘 최신 원장을 ref로 읽습니다.
  const ledger = useRef(tickets);
  ledger.current = tickets;
  const [, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMore, setModalMore] = useState<TicketMoreResult>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [dropping, setDropping] = useState<Dropping | null>(null);
  // 같은 렌더 안의 연타도 막도록 ref로 듭니다(상태는 다음 렌더에야 보입니다).
  const pending = useRef<Dropping | null>(null);
  const status = ticketStatusAt(tickets, Date.now());
  const ticking = modalOpen || blocked !== null;

  useEffect(() => {
    const delay = ticking ? 1_000 : status.nextInMs === null ? null : status.nextInMs + 50;
    if (delay === null) return;
    const timer = setTimeout(() => setTick((value) => value + 1), delay);
    return () => clearTimeout(timer);
  });

  const finishDrop = (): void => {
    "background only";
    const current = pending.current;
    if (current === null) return;
    pending.current = null;
    setDropping(null);
    current.open();
  };

  useEffect(() => {
    if (dropping === null) return;
    const timer = setTimeout(finishDrop, ticketDropFallbackMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropping]);

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

  const gate = createTicketStart({
    ledger: () => ledger.current,
    setLedger: write,
    now: () => Date.now(),
    onOutOfTickets: (open) => {
      eventSink?.({ name: "tickets_ran_out" });
      setBlocked({ open, more: null });
    },
    onSpent:
      options.chipShown && dropWaitEnabled
        ? (from, open) => {
            const next = { from, open };
            pending.current = next;
            setDropping(next);
          }
        : undefined,
  });
  const startWithTicket: TicketStart = (isReplay, open) => {
    if (pending.current !== null) return;
    gate(isReplay, open);
  };

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
      dropFrom: dropping?.from ?? null,
      onDropped: finishDrop,
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
