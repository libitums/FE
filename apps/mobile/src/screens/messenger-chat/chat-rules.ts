// 보내기 · 신고 · 고쳐 주세요 · 사진/음성 요청 판정과 음성 길이 표기입니다(messenger-chat-ui spec §5.5).

import { coinPlanFor } from "./chat-coins";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatReportReasonId } from "./chat-source.contract";

export type AskMediaPlan =
  | { readonly kind: "ask"; readonly price: number }
  | { readonly kind: "top-up"; readonly price: number; readonly shortBy: number };

export function canSend(text: string): boolean {
  return text.trim() !== "";
}

/** 코드 포인트 기준 앞 max개만 남깁니다. */
export function clampText(value: string, max: number): string {
  const points = [...value];
  return points.length <= max ? value : points.slice(0, max).join("");
}

/** 신고 사유 하나를 켜거나 끕니다 — 켜진 사유는 시트의 고정 순서로 둡니다. */
export function toggledReportReason(
  reasons: readonly ChatReportReasonId[],
  id: ChatReportReasonId,
): readonly ChatReportReasonId[] {
  return reasons.includes(id)
    ? reasons.filter((reason) => reason !== id)
    : CHAT_PLACEHOLDERS.reportReasons.filter((reason) => reason === id || reasons.includes(reason));
}

export function canSendReport(reasons: readonly ChatReportReasonId[]): boolean {
  return reasons.length >= 1;
}

export function askMediaPlan(balance: number, price: number): AskMediaPlan {
  const plan = coinPlanFor(balance, price);
  return plan.kind === "pay" ? { kind: "ask", price } : plan;
}

/** 올림 초를 "m:ss"로 적습니다. 음수 · NaN은 "0:00"입니다. */
export function voiceDurationLabel(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "0:00";
  const total = Math.ceil(durationMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
