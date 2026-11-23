// 구독 중 Plans 테스트 대역(ADR-0160) — 서버 권한 한 줄. 만료는 기기 시각의 12월 18일 정오라 「Dec 18」로 읽힙니다.

import type { PlanEntitlements, PlanId } from "../../lib/plans-api";

export const renewsAt = new Date(2026, 11, 18, 12, 0, 0).toISOString();

const products: Readonly<Record<PlanId, string>> = {
  unlimited_tickets: "duru.tickets",
  chat_plus: "duru.chatplus",
  premium: "duru.premium",
};

export function subscribedTo(
  id: PlanId,
  period: "monthly" | "yearly" = "monthly",
  willRenew = true,
): PlanEntitlements {
  return {
    tier: id === "unlimited_tickets" ? "free" : id,
    unlimitedTickets: id !== "chat_plus",
    entitlements: [
      {
        id,
        productId: `${products[id]}.${period}.v1`,
        status: "active",
        willRenew,
        expiresAt: renewsAt,
      },
    ],
  };
}
