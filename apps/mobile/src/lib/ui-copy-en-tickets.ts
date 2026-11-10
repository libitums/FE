// 영어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";
import { n } from "./ui-copy-en-plural";

const monthsEn = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const ticketsEn: TicketsCopy = {
  ticketsLeft: (count) => `${n(count, "ticket", "tickets")} left`,
  unlimited: "Unlimited tickets",
  unlimitedLine: "No ticket used · Unlimited",
  noTicketNeeded: "No ticket needed",
  unlimitedModal: {
    guestPass: "GUEST PASS",
    guestMessage: "Every lesson and roleplay is open\non this account.",
    gotIt: "Got it",
    renewsOn: "Renews on",
    endsOn: "Ends on",
    memberSince: (date) => `Member since ${date}`,
    endsDate: (date) => `Ends ${date}`,
    daysLeft: (days) => (days === 1 ? "1 day left" : `${String(days)} days left`),
    dayProgress: (left, total) => `${String(left)} of ${String(total)} days`,
    activeMessage: "Start any lesson without a ticket.",
    endingMessage: "After that, lessons use tickets again.\nYou keep all your progress.",
    manage: "Manage subscription",
    keep: "Keep unlimited",
    date: (d) => `${monthsEn[d.month - 1] ?? ""} ${String(d.day)}, ${String(d.year)}`,
    shortDate: (d) => `${monthsEn[d.month - 1] ?? ""} ${String(d.day)}`,
    intro: {
      title: "Go unlimited",
      benefitMessages: "No daily limit on chat messages",
      benefitLessons: "Start any lesson without a ticket",
      comingSoon: "Coming soon",
      comingSoonNote: "Unlimited plans are not on sale yet. We will let you know when they are.",
    },
  },
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
