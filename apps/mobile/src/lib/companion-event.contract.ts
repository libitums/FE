// 엽전 출시 · 메신저 · 새 친구 · 영역 사용의 제품 사용 이벤트입니다(ADR-0029 「D3 목적 구분」). 타입만 둡니다.
// 모든 이벤트가 공통 속성 둘을 싣습니다 — 일어난 영역(`surface`)과 기기 첫 실행일부터 지난 날 수(`daysSinceFirstOpen`).
// 수는 10진 문자열입니다(이벤트 속성은 계약상 문자열 · 불리언뿐 — `analytics.contract.ts` ②). 메시지 본문 · 개인정보는 싣지 않습니다.

/** 이벤트가 일어난 영역입니다 — 여정(학습) 탭 쪽이면 `learning`, 메신저 탭 쪽이면 `chat`. */
export type EventSurface = "learning" | "chat";

type Common = {
  readonly surface: EventSurface;
  /** 기기 첫 실행일(`first-open.ts`)부터 지난 날 수 — 10진 문자열, 첫날은 "0". */
  readonly daysSinceFirstOpen: string;
};

/** 엽전 출시 안내(ADR-0140) — 엽전 모달 · 채팅 모달. */
export type LaunchEvent =
  | (Common & {
      readonly name: "launch_coins_shown";
      readonly learning: string;
      readonly bonus: string;
      readonly balance: string;
    })
  | (Common & { readonly name: "launch_coins_closed" })
  | (Common & { readonly name: "launch_chat_shown"; readonly met: string; readonly total: string })
  | (Common & {
      readonly name: "launch_chat_closed";
      readonly choice: "start" | "later" | "back";
    });

/** 메신저 첫 입장 안내(ADR-0139) · 메신저 탭 열기. */
export type MessengerGuideEvent =
  | (Common & {
      readonly name: "messenger_guide_finished";
      readonly part: "list" | "room";
      readonly outcome: "done" | "skipped";
    })
  | (Common & {
      readonly name: "messenger_tab_opened";
      /** 들어가기 직전 탭 배지 — 처음(`first`) · 안 연 새 친구(`new_friend`) · 없음. */
      readonly badge: "first" | "new_friend" | "none";
    });

/** 인물 해금(ADR-0141) · 새 친구 시트. */
export type CompanionUnlockEvent =
  | (Common & {
      readonly name: "companion_unlocked";
      readonly characterId: string;
      readonly episodeId: string;
      readonly source: "episode" | "backfill";
    })
  | (Common & {
      readonly name: "new_friend_sheet_closed";
      readonly characterId: string;
      readonly choice: "reply" | "later";
    });

/** 메신저 보내기 · 엽전(ADR-0140 단가). */
export type ChatCoinEvent =
  | (Common & {
      readonly name: "chat_message_sent";
      readonly characterId: string;
      readonly paid: boolean;
      readonly cost: string;
    })
  | (Common & {
      readonly name: "chat_media_requested";
      readonly characterId: string;
      readonly media: "photo" | "voice";
      readonly price: string;
    })
  | (Common & {
      readonly name: "chat_coins_short";
      readonly reason: "message" | "photo" | "voice";
      readonly shortBy: string;
    });

/** 영역 사용 요약 · 첫 경험 마일스톤(사용자 기기당 한 번). */
export type SurfaceUsageEvent =
  | (Common & { readonly name: "surface_session_ended"; readonly seconds: string })
  | (Common & { readonly name: "first_lesson_completed" })
  | (Common & { readonly name: "first_chat_message_sent"; readonly characterId: string });

/** 연속 학습 엽전 보상(ADR-0143) — 서버가 이번에 지급한 이정표(연속 일수 · 액수). */
export type StreakRewardEvent = Common & {
  readonly name: "streak_reward_collected";
  readonly days: string;
  readonly amount: string;
};

/**
 * 요금제(ADR-0144). `placement`는 요금제가 보인 자리 — `surface`(학습 · 대화, D3 공통 속성)와 따로 둡니다.
 * `view`: `offer` = 맥락 카드(티켓 대화상자 · 메신저 판), `compare` = 설정 → Plans 화면. 구매 이벤트는 2단계.
 */
export type PlanEvent =
  | (Common & {
      readonly name: "plans_viewed";
      readonly placement: "settings" | "tickets" | "messenger";
      readonly view: "offer" | "compare";
    })
  | (Common & {
      readonly name: "plan_selected";
      readonly placement: "settings" | "tickets" | "messenger";
      readonly plan: "unlimited_tickets" | "chat_plus" | "premium";
      readonly period: "monthly" | "yearly";
    });

export type CompanionEvent =
  | LaunchEvent
  | StreakRewardEvent
  | PlanEvent
  | MessengerGuideEvent
  | CompanionUnlockEvent
  | ChatCoinEvent
  | SurfaceUsageEvent;

type WithoutDays<T> = T extends unknown ? Omit<T, "daysSinceFirstOpen"> : never;
/** 보내는 자리가 채우는 모양 — 날 수는 보낼 때 붙습니다(`emitCompanionEvent`). */
export type CompanionEventInput = WithoutDays<CompanionEvent>;
