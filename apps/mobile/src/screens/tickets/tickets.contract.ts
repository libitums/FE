// 학습 티켓 화면들(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄)의 어휘입니다. 타입만 둡니다.

import type { AdTicketEvent } from "../../lib/ad-ticket.contract";
import type { CalendarDate } from "../../lib/unlimited-pass";

/** 「Get more tickets」를 누른 자리입니다. */
export type TicketSurface = "ticket_modal" | "out_of_tickets";

/**
 * 「Get 1 ticket」(엽전으로 1장, 사용자 결정 2026-11-23)을 누른 결과입니다 — 아직 누르지 않았으면 `null`. `buying`은 서버 응답을
 * 기다리는 동안이고 버튼이 눌리지 않습니다. 나머지는 버튼 아래 안내 한 줄로 섭니다.
 */
export type TicketMoreResult =
  | { readonly kind: "buying" }
  | { readonly kind: "bought" }
  | { readonly kind: "short"; readonly shortBy: number }
  | { readonly kind: "full" }
  | { readonly kind: "sign-in" }
  | { readonly kind: "failed" }
  | null;

/** 측정 이벤트에 싣는 결과 — 화면 결과에서 `buying`을 뺀 것입니다. */
export type TicketMoreOutcome = "bought" | "short" | "full" | "sign_in" | "failed";

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
    /** 보상 이용권(ADR-0175)의 남은 시간 · 「N of M hours」. */
    readonly hoursLeft: (hours: number) => string;
    readonly hourProgress: (left: number, total: number) => string;
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
  /** 버튼 글자 「Get 1 ticket」 — 값(엽전)은 옆 알약에 숫자로 섭니다. */
  readonly getMore: string;
  /** 버튼 낭독 「Get 1 ticket for 20 coins」. */
  readonly getMoreLabel: (price: number) => string;
  readonly moreNotice: {
    readonly bought: string;
    /** 모자란 엽전 수를 말합니다. */
    readonly short: (more: number) => string;
    readonly full: string;
    readonly signIn: string;
    readonly failed: string;
  };
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
  /** 광고 보고 티켓(ADR-0208 D9) — PostHog만. */
  | AdTicketEvent
  | {
      readonly name: "ticket_more_tapped";
      readonly surface: TicketSurface;
      readonly result: TicketMoreOutcome;
      /** 그 탭의 값(엽전, 10진 문자열 — 이벤트 속성은 문자열 · 불리언뿐) — 서버가 돌려준 값, 모르면 앱 기본값입니다. */
      readonly price: string;
    };
