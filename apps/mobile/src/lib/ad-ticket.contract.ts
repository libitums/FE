// 광고 보고 티켓 1장(ADR-0209)의 앱 쪽 계약 — 서버 상태 · 광고 결과 · 화면 상태 · 이벤트. 타입만 둡니다.
// 서버(`ad_ticket_status` · `ad_ticket_start`)가 스위치 · 대상 · 하루 상한을 판정하고, Google SSV 콜백 뒤 `granted`를 기록합니다.
// 앱은 그 기록을 읽은 뒤에만 원장에 1장을 더합니다(엽전 구매와 같은 `addBoughtTicket`).

/** `ad_ticket_status` 응답입니다. 모양이 틀리면 읽지 않습니다(null). */
export type AdTicketServerStatus = {
  readonly enabled: boolean;
  readonly eligible: boolean;
  readonly cap: number;
  readonly left: number;
  /** 물은 요청의 지급 상태 — 묻지 않았거나 남의 것이면 null. */
  readonly request: {
    readonly status: "pending" | "granted" | "rejected";
    readonly reason: string | null;
  } | null;
};

/** `ad_ticket_start` 응답입니다. */
export type AdTicketStart =
  | {
      readonly result: "ok";
      readonly requestId: string;
      readonly left: number;
      readonly cap: number;
    }
  | { readonly result: "blocked"; readonly left: number; readonly cap: number }
  | { readonly result: "limit"; readonly left: number; readonly cap: number };

/** 호스트 광고 불러오기 결과 — 광고가 없거나(no fill) 오프라인 · 오류는 모두 `unavailable`입니다(A5). */
export type RewardedAdLoad = "loaded" | "unavailable";

/** 호스트 광고 보여 주기 결과 — 끝까지 봐 보상을 받았는가(`earned`) · 일찍 닫음 · 띄우지 못함. */
export type RewardedAdShow = "earned" | "dismissed" | "failed";

/**
 * 대화상자의 광고 줄 상태입니다(시안 A1 ~ A5).
 *
 * - `hidden` — 그리지 않습니다(플래그 · 모듈 · 서버 스위치 · 대상 · 비회원 · 아직 모름).
 * - `offer` — A1 「Watch a short ad · +1 ticket · N left today · Free」. `failed`면 그 위에 실패 안내 한 줄.
 * - `busy` — A2 버튼 안 로딩. `step`은 불러오는 중(`loading`) · 광고가 떠 있음(`showing`) · 지급 확인 중(`confirming`).
 * - `granted` — A3 받음(`left` = 오늘 남은 광고 횟수).
 * - `limit` — A4 오늘 다 씀(흐리게).
 * - `no-fill` — A5 광고 없음(횟수 차감 없음). `retryAtMs`가 지나면 다시 `offer`.
 */
export type AdTicketState =
  | { readonly kind: "hidden" }
  | {
      readonly kind: "offer";
      readonly left: number;
      readonly cap: number;
      readonly failed: boolean;
    }
  | {
      readonly kind: "busy";
      readonly step: "starting" | "loading" | "showing" | "confirming";
      readonly left: number;
      readonly cap: number;
      readonly requestId: string | null;
      /** 지급 확인을 몇 번 물었는가 — `confirming`에서만 늘어납니다. */
      readonly polls: number;
    }
  | { readonly kind: "granted"; readonly left: number }
  | { readonly kind: "limit"; readonly cap: number }
  | {
      readonly kind: "no-fill";
      readonly left: number;
      readonly cap: number;
      readonly retryAtMs: number;
    };

/** 실패 이벤트의 이유입니다. */
export type AdTicketFailReason =
  | "start_failed"
  | "no_fill"
  | "load_timeout"
  | "show_failed"
  | "closed_early"
  | "rejected"
  | "limit"
  | "confirm_timeout";

export type AdTicketInput =
  /** 서버 상태를 읽었다(null = 읽지 못함 · 비회원). */
  | { readonly type: "status"; readonly status: AdTicketServerStatus | null }
  | { readonly type: "tap" }
  | { readonly type: "started"; readonly start: AdTicketStart | null }
  | { readonly type: "loaded"; readonly load: RewardedAdLoad | "timeout"; readonly nowMs: number }
  | { readonly type: "shown"; readonly show: RewardedAdShow }
  | { readonly type: "polled"; readonly status: AdTicketServerStatus | null }
  | { readonly type: "retry" };

/** 상태 전이와 함께 낼 일 — 이벤트 · 지급(원장에 1장) · 다음 동작. 순수 함수가 정하고 결선이 실행합니다. */
export type AdTicketStep = {
  readonly state: AdTicketState;
  readonly event: AdTicketEvent | null;
  /** 참이면 원장에 1장을 더합니다(서버가 지급을 확인한 순간 한 번). */
  readonly grant: boolean;
};

/** PostHog 이벤트입니다(Airbridge 매핑 없음). 속성은 문자열 · 불리언뿐입니다. */
export type AdTicketEvent =
  /**
   * 대상 회원에게 「Out of tickets」가 섰다 — 실험군(`test`)은 광고 줄을 봤고 대조군(`control`)은 보지 않았다. 실험 노출 이벤트입니다.
   */
  | {
      readonly name: "ad_ticket_offer_shown";
      readonly arm: "test" | "control";
      readonly left: string;
    }
  | { readonly name: "ad_ticket_started" }
  | { readonly name: "ad_ticket_completed" }
  | { readonly name: "ad_ticket_failed"; readonly reason: AdTicketFailReason }
  | { readonly name: "ad_ticket_granted"; readonly left: string };

export type AdTicketEventSink = ((event: AdTicketEvent) => void) | undefined;

/** 광고 줄 화면이 받는 결선입니다. */
export type AdTicketWiring = {
  readonly state: AdTicketState;
  readonly onWatch: () => void;
};
