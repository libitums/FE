// 학습 티켓 화면들(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄)의 어휘입니다. 타입만 둡니다.

import type { CalendarDate } from "../../lib/unlimited-pass";

/** 「Get more tickets」를 누른 자리입니다. */
export type TicketSurface = "ticket_modal" | "out_of_tickets";

/** 눌렀을 때 무료 1장을 받았는가입니다 — 아직 누르지 않았으면 `null`. Coming soon 안내 문구가 갈립니다. */
export type TicketMoreResult = { readonly granted: boolean } | null;

export type TicketsCopy = {
  /** 칩 · 결과 줄의 「N tickets left」입니다. */
  readonly ticketsLeft: (count: number) => string;
  /** 무제한 칩 · 모달 제목 「Unlimited tickets」입니다(ADR-0085 · ADR-0115). */
  readonly unlimited: string;
  /** 결과 화면 알약 「No ticket used · Unlimited」입니다(ADR-0115). */
  readonly unlimitedLine: string;
  /** 무제한일 때 「Next lesson」 버튼 태그의 낭독 「No ticket needed」입니다. */
  readonly noTicketNeeded: string;
  /** 무제한 모달(시험 계정 · 구독 갱신 · 갱신 꺼짐 · 곧 끝남)입니다. 날짜는 언어마다 쓰는 모양이 달라 함수입니다. */
  readonly unlimitedModal: {
    readonly guestPass: string;
    readonly guestMessage: string;
    readonly gotIt: string;
    readonly renewsOn: string;
    readonly endsOn: string;
    readonly memberSince: (date: string) => string;
    readonly endsDate: (date: string) => string;
    readonly daysLeft: (days: number) => string;
    readonly dayProgress: (left: number, total: number) => string;
    readonly activeMessage: string;
    readonly endingMessage: string;
    readonly manage: string;
    readonly keep: string;
    readonly date: (date: CalendarDate) => string;
    readonly shortDate: (date: CalendarDate) => string;
  };
  readonly modal: {
    /** 큰 숫자 아래 제목 — 「tickets left」 · 「ticket left」. */
    readonly title: (count: number) => string;
    readonly nextTicketIn: string;
    /** 칸 셋의 낭독 — 남은 장 · 전체 · 다음 충전까지(가득이면 null). */
    readonly slotsLabel: (available: number, total: number, nextClock: string | null) => string;
    readonly slotReady: string;
    readonly message: string;
  };
  readonly getMore: string;
  readonly moreNotice: { readonly granted: string; readonly notGranted: string };
  readonly outOfTickets: {
    readonly title: string;
    readonly untilNext: string;
    /** 원형 카운트다운의 낭독입니다. */
    readonly clockLabel: (clock: string) => string;
    readonly message: string;
    readonly startLesson: string;
    readonly backToMap: string;
  };
  /** 말풍선 Start 버튼에 붙는 태그의 낭독 — 「Uses 1 ticket」. */
  readonly startCost: string;
};

export type TicketEvent =
  | { readonly name: "tickets_ran_out" }
  | {
      readonly name: "ticket_more_tapped";
      readonly surface: TicketSurface;
      readonly granted: boolean;
    };
