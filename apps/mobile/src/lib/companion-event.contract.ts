// 엽전 출시 · 메신저 · 새 친구 · 영역 사용의 제품 사용 이벤트입니다(ADR-0029 「D3 목적 구분」). 타입만 둡니다.
// 모든 이벤트가 공통 속성 둘을 싣습니다 — 일어난 영역(`surface`)과 기기 첫 실행일부터 지난 날 수(`daysSinceFirstOpen`).
// 수는 10진 문자열입니다(이벤트 속성은 계약상 문자열 · 불리언뿐 — `analytics.contract.ts` ②). 메시지 본문 · 개인정보는 싣지 않습니다.

import type { ChatSuggestionEvent } from "./chat-suggestion-event.contract";
import type { FriendStoryEvent } from "./friend-story-event.contract";
import type { MoreEvent } from "./more-event.contract";

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
      /** `snapshot` — 안내를 이미 본 사람에게 예시 스냅샷 단계만 뜬 것(ADR-0146 추가). `keyboard` — 키보드 단계가 든 것(ADR-0190). */
      readonly part: "list" | "room" | "snapshot" | "keyboard";
      readonly outcome: "done" | "skipped";
    })
  /**
   * 방 안내의 키보드 단계(ADR-0190) — 화면이 섬(shown) · Next(next) · 학습자가 토글을 직접 바꿈(switched, stage = 바꾼 뒤 화면) ·
   * 휴대폰 키보드 화면에서 키보드가 내려가 Hangul keys로 넘어감(hidden, stage = phone — Android 뒤로가기 등, 2026-11-24).
   */
  | (Common & {
      readonly name: "messenger_guide_keyboard";
      readonly stage: "phone" | "hangul";
      readonly action: "shown" | "next" | "switched" | "hidden";
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

/**
 * 추천 친구 줄 · 친구 찾기(ADR-0162). `viewed`: 줄이 처음 보일 때 목록 마운트당 한 번(보인 수). `added`: 방을 열었음 —
 * `via` free = Start chatting, early = 엽전 먼저 만나기. `early_access_tapped`: 「Chat now」 단추를 누름(결제 전 의향).
 */
export type SuggestedFriendEvent =
  | (Common & { readonly name: "suggested_friend_viewed"; readonly count: string })
  /** 프로필 시트를 열었음(ADR-0164 「분석 이벤트」) — 줄 · 친구 찾기 어디서 열었는지. PostHog만(Airbridge 매핑 없음). */
  | (Common & {
      readonly name: "suggested_friend_opened";
      readonly characterId: string;
      readonly kind: "story" | "general";
      readonly from: "row" | "directory" | "story_row" | "story_viewer";
    })
  | (Common & {
      readonly name: "suggested_friend_added";
      readonly characterId: string;
      readonly kind: "story" | "general";
      readonly from: "row" | "directory" | "story_row" | "story_viewer";
      readonly via: "free" | "early";
    })
  | (Common & {
      readonly name: "early_access_tapped";
      readonly characterId: string;
      readonly price: string;
      readonly from: "row" | "directory" | "story_row" | "story_viewer";
    })
  /** 먼저 만나기 RPC가 끝났습니다(ADR-0162 D5) — 누른 뒤 한 번. unlocked = 이미 산 인물(already) 포함, failed = 제안 없음 · 오류. */
  | (Common & {
      readonly name: "early_access_completed";
      readonly characterId: string;
      readonly outcome: "unlocked" | "short" | "failed";
    });

/** 메신저 보내기 · 엽전(ADR-0140 단가). */
export type ChatCoinEvent =
  | (Common & {
      readonly name: "chat_message_sent";
      readonly characterId: string;
      readonly paid: boolean;
      readonly cost: string;
      /** 스토리 첫 답장 무료로 보냄(ADR-0178 D6) — 앱 힌트이고 정본은 서버 `companion.story_replies.free`. */
      readonly storyFree?: true;
      readonly fromSuggestion: boolean; // 답할 문장 추천(보기)을 눌러 보냄(ADR-0195) — 칩을 고쳐 보내는 길은 없습니다.
    })
  | (Common & {
      readonly name: "chat_media_requested";
      readonly characterId: string;
      readonly media: "photo" | "voice";
      readonly price: string;
    })
  /** 서버 사진 · 음성(ADR-0146)이 끝났거나 거절됐습니다 — 요청한 뒤 한 번. */
  | (Common & {
      readonly name: "chat_media_completed";
      readonly characterId: string;
      readonly media: "photo" | "voice";
      readonly outcome: "complete" | "blocked" | "failed" | "refused";
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
 * 가입 보상(ADR-0174). `signup_reward_card_shown`: 손님 지도 하단 권유 카드가 세션에 처음 보일 때 한 번. `signup_reward_card_tapped`: 카드를
 * 눌러 로그인 화면으로 갈 때마다. `signup_reward_shown`: 서버가 지급한 뒤 보상 모달이 설 때 한 번(받은 수) — `unlimited`는 그 창에 첫날 무제한 줄(ADR-0186 개정 3)이 섰는지(shown · none).
 * 같은 틀의 Chat Plus 첫 구독 보너스(ADR-0196 D5) `subscription_bonus_shown`: 서버가 알린 보너스 모달이 설 때 한 번(받은 수 · 요금제).
 */
export type SignupRewardEvent =
  | (Common & { readonly name: "signup_reward_card_shown" })
  | (Common & { readonly name: "signup_reward_card_tapped" })
  | (Common & { name: "signup_reward_shown"; amount: string; unlimited: "shown" | "none" })
  | (Common & { name: "subscription_bonus_shown"; plan: "chat_plus"; amount: string });

/**
 * 푸시 캠페인 보상(ADR-0175). `push_reward_claimed`: 알림을 눌러 들어와 서버가 지급했을 때 한 번 — `amount`는 엽전 수 또는 무제한 티켓
 * 시간. `push_reward_failed`: 받지 못했을 때 — `reason`은 서버 판정(already_claimed · not_recipient · expired · unknown), 손님 guest,
 * 응답 없음 error. 캠페인 id가 없는 알림은 묻지도 남기지도 않는다.
 */
export type PushRewardEvent =
  | (Common & {
      readonly name: "push_reward_claimed";
      readonly kind: "coins" | "tickets";
      readonly amount: string;
    })
  | (Common & { readonly name: "push_reward_failed"; readonly reason: string });

/** 요금제가 보인 자리(ADR-0144 · 상점 입구 ADR-0160) — `PlanPlacement`와 같은 값입니다. */
type PlanEventPlacement =
  | "settings"
  | "tickets"
  | "messenger"
  | "header_chip"
  | "coin_shop"
  | "chat_send"
  | "tickets_chip";
type PlanEventId = "unlimited_tickets" | "chat_plus" | "premium";

/**
 * 요금제(ADR-0144). `placement`는 요금제가 보인 자리 — `surface`(학습 · 대화, D3 공통 속성)와 따로 둡니다.
 * `view`: `offer` = 맥락 카드(티켓 대화상자 · 메신저 판), `compare` = 설정 → Plans 화면 · 상점 Plans 탭. 구매 이벤트는 2단계.
 * `purchase_intent`(추가 2026-11-17): 구매 단추(요금제 Continue · 엽전 팩 사기)를 누름 — 결제 전에도 의향을 잽니다. `price`는 보인 가격의
 * 금액(10진 문자열, 스토어가 금액을 주지 않았으면 빈 문자열), `currency`, `country`(스토어 계정 나라, 모르면 가격 지역 VN · ID · PH · TH · MY · US),
 * `priceSource`(store = 스토어 상품 가격 · provisional = 임시 추천 가격, 2단계 2026-11-17), `preview` = 「곧」 안내로 끝남.
 */
export type PlanEvent =
  | (Common & {
      readonly name: "plans_viewed";
      readonly placement: PlanEventPlacement;
      readonly view: "offer" | "compare";
      /** 보던 사람의 지금 요금제(ADR-0160) — 구독이 없으면 free. */
      readonly currentPlan: "free" | PlanEventId;
    })
  | (Common & {
      readonly name: "plan_selected";
      readonly placement: PlanEventPlacement;
      readonly plan: PlanEventId;
      readonly period: "monthly" | "yearly";
      /** 바꿈(ADR-0160): 지금 요금제(없으면 free) → 고른 요금제, 종류(구독 없음 new · 같은 수준 · 기간만은 crossgrade). */
      readonly from: "free" | PlanEventId;
      readonly to: PlanEventId;
      readonly kind: "new" | "upgrade" | "downgrade" | "crossgrade";
    })
  | (Common & {
      readonly name: "purchase_intent";
      readonly placement: PlanEventPlacement;
      readonly kind: "plan" | "pack";
      /** 스토어 상품 id(ADR-0144 D4). */
      readonly product: string;
      /** 엽전 팩은 `once`. */
      readonly period: "monthly" | "yearly" | "once";
      readonly price: string;
      readonly currency: string;
      readonly country: string;
      readonly priceSource: "store" | "provisional" | "";
      readonly preview: boolean;
    })
  /**
   * 엽전 팩 결제 성공(ADR-0063 2026-11-19) — 스토어가 `purchased`로 답한 때 한 번. `price`는 스토어 상품 금액(10진 문자열, 모르면 빈 문자열 —
   * 임시 추천 가격은 싣지 않음), `transactionId`는 스토어 거래 id(모르면 빈 문자열). Airbridge Order Complete로도 나갑니다 — 구독은
   * RevenueCat 서버 연동이 보내므로 이 이벤트가 없습니다.
   */
  | (Common & {
      readonly name: "pack_purchased";
      readonly product: string;
      readonly price: string;
      readonly currency: string;
      readonly transactionId: string;
    })
  /** 하나의 상점(ADR-0160)의 탭 전환 — 위 전환 · 엽전 탭 아래 요금제 줄. */
  | (Common & {
      readonly name: "shop_tab_switched";
      readonly from: "coins" | "plans";
      readonly to: "coins" | "plans";
    });

/**
 * 비회원 로그인 권유(ADR-0166) — 메신저 목록 · 방 · 머리 티켓 모달의 「로그인 필요」 대화상자를 닫을 때 한 번. `trigger`는 권유가 뜬 자리,
 * `choice`는 sign_in(로그인 화면으로) · later(닫기 · 뒤로).
 */
export type GuestPromptEvent = Common & {
  readonly name: "chat_sign_in_prompt_closed";
  readonly trigger: "send" | "media" | "menu" | "coins" | "add_friend" | "tickets";
  readonly choice: "sign_in" | "later";
};

/**
 * 주간 순위(ADR-0170). `ranking_opened`: 순위 화면이 처음 그린 상태(`view`)와 연 자리(탭 · 방 줄). `ranking_own_row_viewed`: 내 줄이
 * 보인 보드마다 한 번(순위 · 점수). `chat_words_earned`: 내 글로 새로 센 단어 수 · 짚혀 아직 안 센 수 · 이번 주 합. 이름 · 단어는 싣지 않는다.
 */
export type RankingEvent =
  | (Common & {
      readonly name: "ranking_opened";
      readonly board: "lessons" | "chat_words";
      readonly source: "tab" | "chat";
      readonly view: "ready" | "not_joined" | "hidden" | "guest" | "error" | "offline";
    })
  | (Common & {
      readonly name: "ranking_board_switched";
      readonly from: "lessons" | "chat_words";
      readonly to: "lessons" | "chat_words";
    })
  | (Common & {
      readonly name: "ranking_own_row_viewed";
      readonly board: "lessons" | "chat_words";
      readonly rank: string;
      readonly score: string;
    })
  | (Common & {
      readonly name: "chat_words_earned";
      readonly count: string;
      readonly pending: string;
      readonly weekTotal: string;
    })
  | (Common & { readonly name: "ranking_hide_toggled"; readonly hidden: boolean });

export type CompanionEvent =
  | MoreEvent
  | RankingEvent
  | LaunchEvent
  | GuestPromptEvent
  | StreakRewardEvent
  | SignupRewardEvent
  | PushRewardEvent
  | PlanEvent
  | MessengerGuideEvent
  | CompanionUnlockEvent
  | SuggestedFriendEvent
  | FriendStoryEvent
  | ChatSuggestionEvent
  | ChatCoinEvent
  | SurfaceUsageEvent;

type WithoutDays<T> = T extends unknown ? Omit<T, "daysSinceFirstOpen"> : never;
/** 보내는 자리가 채우는 모양 — 날 수는 보낼 때 붙습니다(`emitCompanionEvent`). */
export type CompanionEventInput = WithoutDays<CompanionEvent>;
