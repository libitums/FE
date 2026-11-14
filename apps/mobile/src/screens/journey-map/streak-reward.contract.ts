// 연속 학습 모달의 엽전 보상(ADR-0143) 계약입니다 — 모달이 받는 결선과 test id.

import type { StreakRewardClaim } from "../../lib/streak-reward-api";

/** 앱이 연속 학습 모달에 넘기는 보상 결선입니다. 로그인 사용자만 넘어오고, 없으면 모달은 보상 없이 지금 그대로입니다. */
export type StreakRewardWiring = {
  /** 지금 연속 `days`의 이정표 보상을 이미 받았나(기기 기록) — 받았으면 Collect 대신 Continue. */
  readonly collected: (days: number) => boolean;
  /** 서버 지급 — 던지지 않고 실패는 null입니다. */
  readonly claim: () => Promise<StreakRewardClaim | null>;
  /** 지급 결과(실패 null 포함) — 기록 · 칩 잔액 · 이벤트를 앱이 처리합니다. 날기 전에 한 번 부릅니다. */
  readonly onClaimed: (claim: StreakRewardClaim | null, days: number) => void;
  /** 엽전이 하나 닿을 때마다(닿은 수 · 전체 수) — 칩이 그만큼 오릅니다. */
  readonly onCoinLanded: (landed: number, of: number) => void;
  /** 날기가 끝났거나 모달이 닫힘 — 칩이 남은 몫 없이 최종 잔액을 보입니다. */
  readonly onSettled: () => void;
  /** 날아갈 곳 — 머리 엽전 칩 아이콘의 id. */
  readonly coinTargetId: string;
};

export const streakRewardTestIds = {
  tag: (index: number): string => `journey-stat-modal-tag-${index}`,
  goal: "journey-stat-modal-goal",
  goalFill: "journey-stat-modal-goal-fill",
  card: "journey-stat-modal-reward-card",
  collect: "journey-stat-modal-collect",
  flight: "journey-stat-modal-flight",
} as const;

/** 보상 카드의 엽전 — 날기의 출발점입니다. */
export const streakRewardCoinSourceId = "streak-reward-coin-source";
/** 날기 층의 기준점입니다(엽전 출시 모달의 층과 이름이 겹치지 않게). */
export const streakRewardFlightLayerId = "streak-reward-flight-layer";
