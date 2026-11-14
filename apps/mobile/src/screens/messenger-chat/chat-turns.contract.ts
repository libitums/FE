// 하루 무료 수 표시 · 마지막 무료 띠 · 다 쓴 판 · 엽전 보내기 단추 계약입니다(messenger-chat-1-5 spec §6.2 · §10).

import type { PlanOfferWiring } from "../plans/plans.contract";
import type { ResetClock, TurnPlan } from "./free-turns";

export type SendCost =
  | { readonly kind: "free" }
  | { readonly kind: "coin"; readonly price: number; readonly short: boolean };
/** unlimited면 아무것도 그리지 않습니다. */
export type TurnLineProps = { readonly plan: TurnPlan; readonly reset: ResetClock };
export type LastFreeStripProps = { readonly price: number };
export type CoinSendButtonProps = {
  readonly price: number;
  readonly enabled: boolean;
  /** 잔액이 가격보다 모자랍니다 — 누르면 상점이 열리니 이름이 그렇게 알립니다(접근성 M9). */
  readonly short?: boolean;
  readonly onTap: () => void;
};
export type OutOfFreePanelProps = {
  readonly total: number;
  readonly price: number;
  readonly balance: number;
  readonly reset: ResetClock;
  readonly onKeepChatting: () => void;
  readonly onBackToChats: () => void;
  /** 아래 안전 영역(px)입니다. 기본 0. */
  readonly bottomInset?: number;
  /** 요금제 카드(Chat Plus · Premium, ADR-0144) — 기능 플래그가 꺼졌으면 없음, 판은 지금 그대로. */
  readonly offer?: PlanOfferWiring;
};

const turns = (suffix: string): string => `messenger-chat-${suffix}`;

export const chatTurnsTestIds = {
  line: turns("turn-line"),
  strip: turns("turn-strip"),
  panel: turns("out-panel"),
  panelTitle: turns("out-title"),
  panelKeep: turns("out-keep"),
  panelBack: turns("out-back"),
  panelBalance: turns("out-balance"),
  panelScroll: turns("out-scroll"),
  panelScrollContent: turns("out-scroll-content"),
  panelActions: turns("out-actions"),
  coinSend: turns("coin-send"),
} as const;
