import { describe, expect, test } from "vitest";

import type { PlanEntitlement, PlanEntitlements } from "../lib/plans-api";
import {
  subscriptionBonusAskKey,
  subscriptionBonusHoldsLater,
  subscriptionBonusRecordAfter,
  subscriptionBonusRecordFrom,
  subscriptionBonusStep,
  subscriptionBonusStorageKey,
} from "./subscription-bonus-record";

// `unit` 계층(CB-U3 ~ U8): Chat Plus 첫 구독 보너스(ADR-0196 D3 · D4)의 판정과 기기 기록 — 순수.

const row = (
  id: PlanEntitlement["id"],
  expiresAt: string | null = "2026-12-25T00:00:00Z",
): PlanEntitlement => ({
  id,
  productId: `duru.${id}.monthly.v1`,
  status: "active",
  willRenew: true,
  expiresAt,
});
const of = (...rows: PlanEntitlement[]): PlanEntitlements => ({
  tier: rows.some((r) => r.id === "premium")
    ? "premium"
    : rows.some((r) => r.id === "chat_plus")
      ? "chat_plus"
      : "free",
  unlimitedTickets: rows.some((r) => r.id !== "chat_plus"),
  entitlements: rows,
});

describe("CB-U3 언제 묻나 — 묻는 열쇠", () => {
  test("권한을 못 읽음 · 구독 없음 · Unlimited Tickets만이면 묻지 않는다(null)", () => {
    expect(subscriptionBonusAskKey(null)).toBeNull();
    expect(subscriptionBonusAskKey(of())).toBeNull();
    expect(subscriptionBonusAskKey(of(row("unlimited_tickets")))).toBeNull();
  });

  test("Chat Plus · Premium 줄이 있으면 열쇠 — 줄의 만료가 바뀌면(체험 → 유료 RENEWAL) 열쇠도 바뀐다", () => {
    const trial = subscriptionBonusAskKey(of(row("chat_plus", "2026-11-28T00:00:00Z")));
    const paid = subscriptionBonusAskKey(of(row("chat_plus", "2026-12-28T00:00:00Z")));
    expect(trial).not.toBeNull();
    expect(paid).not.toBeNull();
    expect(paid).not.toBe(trial);
    expect(subscriptionBonusAskKey(of(row("premium")))).not.toBeNull();
    // Tickets 줄은 열쇠에 들지 않는다 — Tickets만 바뀌어도 다시 묻지 않는다.
    expect(
      subscriptionBonusAskKey(
        of(row("chat_plus"), row("unlimited_tickets", "2027-01-01T00:00:00Z")),
      ),
    ).toBe(subscriptionBonusAskKey(of(row("chat_plus"))));
  });
});

describe("CB-U4 알림 응답 뒤의 기록", () => {
  test("이번에 알린 수가 있으면 모달 대기", () => {
    expect(
      subscriptionBonusRecordAfter({ amount: 100, reason: "announced", balance: 400 }),
    ).toEqual({
      amount: 100,
      shown: false,
    });
  });
  test("이미 다른 기기 · 설치에서 알렸으면 끝난 것으로 — 다시 묻지 않는다", () => {
    expect(
      subscriptionBonusRecordAfter({ amount: 0, reason: "already_announced", balance: 10 }),
    ).toEqual({ amount: 0, shown: true });
  });
  test("아직 없음(체험 · 웹훅 늦음)이면 적지 않는다 — 다음 바뀜에 다시 묻는다", () => {
    expect(subscriptionBonusRecordAfter({ amount: 0, reason: "none", balance: 10 })).toBeNull();
  });
});

describe("CB-U5 모달을 세우나", () => {
  const pending = { amount: 100, shown: false };
  test("로그인 · 한가 · 첫 유닛 안내 꺼짐 · 본 적 없는 보너스면 모달", () => {
    expect(
      subscriptionBonusStep({ signedIn: true, record: pending, idle: true, guideOn: false }),
    ).toBe("modal");
  });
  test("하나라도 아니면 null", () => {
    expect(
      subscriptionBonusStep({ signedIn: false, record: pending, idle: true, guideOn: false }),
    ).toBeNull();
    expect(
      subscriptionBonusStep({ signedIn: true, record: pending, idle: false, guideOn: false }),
    ).toBeNull();
    expect(
      subscriptionBonusStep({ signedIn: true, record: pending, idle: true, guideOn: true }),
    ).toBeNull();
    expect(
      subscriptionBonusStep({
        signedIn: true,
        record: { amount: 100, shown: true },
        idle: true,
        guideOn: false,
      }),
    ).toBeNull();
    expect(
      subscriptionBonusStep({ signedIn: true, record: null, idle: true, guideOn: false }),
    ).toBeNull();
  });
});

describe("CB-U6 뒤 안내(엽전 출시 · 업데이트 · Letters)를 미루나", () => {
  test("묻는 중 · 모달 대기 · 날기 동안만", () => {
    expect(subscriptionBonusHoldsLater({ asking: true, record: null, flying: false })).toBe(true);
    expect(
      subscriptionBonusHoldsLater({
        asking: false,
        record: { amount: 100, shown: false },
        flying: false,
      }),
    ).toBe(true);
    expect(
      subscriptionBonusHoldsLater({
        asking: false,
        record: { amount: 100, shown: true },
        flying: true,
      }),
    ).toBe(true);
    expect(
      subscriptionBonusHoldsLater({
        asking: false,
        record: { amount: 100, shown: true },
        flying: false,
      }),
    ).toBe(false);
    expect(subscriptionBonusHoldsLater({ asking: false, record: null, flying: false })).toBe(false);
  });
});

describe("CB-U7 기기 기록 읽기", () => {
  test("계정마다 따로인 열쇠", () => {
    expect(subscriptionBonusStorageKey("u1")).toBe("libitum.subscription-bonus.u1");
  });
  test("모양이 맞으면 값, 틀리면 null", () => {
    expect(subscriptionBonusRecordFrom(JSON.stringify({ amount: 100, shown: false }))).toEqual({
      amount: 100,
      shown: false,
    });
    expect(subscriptionBonusRecordFrom(JSON.stringify({ amount: 0, shown: true }))).toEqual({
      amount: 0,
      shown: true,
    });
    expect(subscriptionBonusRecordFrom(null)).toBeNull();
    expect(subscriptionBonusRecordFrom("")).toBeNull();
    expect(subscriptionBonusRecordFrom("{")).toBeNull();
    expect(subscriptionBonusRecordFrom(JSON.stringify({ amount: -1, shown: true }))).toBeNull();
  });
});
