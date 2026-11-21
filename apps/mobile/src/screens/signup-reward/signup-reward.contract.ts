// 가입 보상 카드 · 모달의 계약입니다(ADR-0174, 시안 Main · Reward · Wallet).

export const signupRewardTestIds = {
  card: "signup-reward-card",
  modal: "signup-reward-modal",
  amount: "signup-reward-amount",
  gotIt: "signup-reward-got-it",
  /** 무제한 티켓 보상의 무대(ADR-0175) — 주황 무한 기호 · 티켓 톡. */
  ticketStage: "reward-ticket-stage",
} as const;

/** 모달 금액 줄의 엽전 — 날기의 출발점입니다. */
export const signupRewardCoinSourceId = "signup-reward-coin-source";

export type SignupRewardCardProps = {
  readonly amount: number;
  /** 셸 기준 `bottom`(바 높이 + 간격 + 바 밑 시스템 바 몫 — `signupCardBottom`). */
  readonly bottom: number;
  /** 카드 탭 — 손님 로그인(ADR-0111 `guest-login`)을 엽니다. */
  readonly onSignUp: () => void;
};

export type SignupRewardModalProps = {
  readonly amount: number;
  /** 이 세션에서 손님이 계정을 만들었나 — 보조문이 갈립니다. */
  readonly fromGuest: boolean;
  /** 날아갈 곳 — 지도 머리 엽전 칩 아이콘의 id. */
  readonly coinTargetId: string;
  /** 엽전이 하나 닿을 때마다(닿은 수 · 전체 수). */
  readonly onCoinLanded?: (landed: number, of: number) => void;
  /** 「Got it」을 눌러 날기가 시작될 때(움직임 줄이기면 부르지 않음). */
  readonly onFlightStart?: () => void;
  /** 마지막 엽전이 닿은 뒤(움직임 줄이기면 곧바로) — 닫기. */
  readonly onDone: () => void;
};

/** 보상 모달이 그리는 보상(ADR-0175) — 엽전은 금액이 오르고 칩으로 날고, 무제한 티켓은 시간을 보이고 곧바로 닫힙니다. */
export type RewardModalReward =
  | { readonly kind: "coins"; readonly amount: number }
  | { readonly kind: "tickets"; readonly hours: number };

/** 가입 보상 · 푸시 캠페인 보상이 함께 쓰는 틀(엽전 출시 모달과 같은 막 · 흰 상자 · 위 알약 · Got it). */
export type RewardModalProps = Omit<SignupRewardModalProps, "amount" | "fromGuest"> & {
  readonly tag: string;
  readonly title: string;
  readonly body: string;
  readonly reward: RewardModalReward;
};
