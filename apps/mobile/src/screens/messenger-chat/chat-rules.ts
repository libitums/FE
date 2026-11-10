// 보내기 · 신고 · 고쳐 주세요 · 사진/음성 요청 판정과 음성 길이 표기입니다(messenger-chat-ui spec §5.5).

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

export function canSendFix(text: string): boolean {
  return text.trim() !== "";
}

export function canSendReport(reasons: readonly ChatReportReasonId[]): boolean {
  return reasons.length >= 1;
}

export function askMediaPlan(balance: number, price: number): AskMediaPlan {
  if (balance >= price) return { kind: "ask", price };
  return { kind: "top-up", price, shortBy: price - balance };
}

/** 올림 초를 "m:ss"로 적습니다. 음수 · NaN은 "0:00"입니다. */
export function voiceDurationLabel(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "0:00";
  const total = Math.ceil(durationMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
