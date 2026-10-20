// 영어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";
import { n } from "./ui-copy-en-plural";

export const ticketsEn: TicketsCopy = {
  ticketsLeft: (count) => `${n(count, "ticket", "tickets")} left`,
  modal: {
    title: (count) => (count === 1 ? "ticket left" : "tickets left"),
    nextTicketIn: "Next ticket in",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `${String(available)} of ${String(total)} tickets ready`
        : `${String(available)} of ${String(total)} tickets ready. Next ticket in ${nextClock}`,
    slotReady: "Ready",
    message: "Each lesson uses one ticket.\nA used ticket charges back in 1 hour.",
  },
  getMore: "Get more tickets",
  moreNotice: {
    granted: "More ways to get tickets are coming soon. Here's a free ticket for today!",
    notGranted: "More ways to get tickets are coming soon.",
  },
  outOfTickets: {
    title: "Out of tickets",
    untilNext: "until your next ticket",
    clockLabel: (clock) => `${clock} until your next ticket`,
    message: "You need a ticket to start this lesson.\nEach ticket charges back in 1 hour.",
    startLesson: "Start lesson",
    backToMap: "Back to map",
  },
  startCost: "Uses 1 ticket",
};
