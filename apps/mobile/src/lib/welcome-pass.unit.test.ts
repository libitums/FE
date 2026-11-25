import { afterEach, expect, test } from "vitest";

import type { AuthSession } from "./auth-session.contract";
import {
  rewardTicketPassActive,
  setRewardTicketPass,
  setWelcomeTicketPass,
} from "./reward-ticket-pass";
import * as welcomePass from "./welcome-pass";
import type { PlanEntitlements } from "./plans-api";
import { subscriptionStateOf } from "./plan-access";
import {
  WELCOME_PASS_MS,
  laterTimedPass,
  welcomePassOf,
  welcomePassStartOf,
  welcomeTicketUntilMs,
} from "./welcome-pass";

// 첫날 무제한 티켓 — 회원만(ADR-0186 개정 1). 기준은 계정 생성 시각(세션의 `accountCreatedAt`)이고 기기 저장소를 쓰지 않습니다.

const HOUR = 3_600_000;
const session = (accountCreatedAt?: number): AuthSession => ({
  accessToken: "a",
  refreshToken: "r",
  expiresAt: 9_999_999_999_999,
  ...(accountCreatedAt === undefined ? {} : { accountCreatedAt }),
});

afterEach(() => {
  setRewardTicketPass(0);
  setWelcomeTicketPass(0);
});

test("WP-U1 비회원(세션 없음) · 생성 시각을 모르는 세션은 시작 시각이 없다 — 이용권 없음", () => {
  expect(welcomePassStartOf(null)).toBeNull();
  expect(welcomePassStartOf(session())).toBeNull();
  expect(welcomePassOf(welcomePassStartOf(null), 0, "none")).toBeUndefined();
});

test("WP-U2 회원의 시작 시각은 계정 생성 시각이고, 생성 뒤 24시간 안이면 그 끝까지 timed 이용권", () => {
  const created = 100 * HOUR;
  expect(welcomePassStartOf(session(created))).toBe(created);
  const expected = { kind: "timed", startedAtMs: created, endsAtMs: created + WELCOME_PASS_MS };
  expect(welcomePassOf(created, created, "none")).toEqual(expected);
  expect(welcomePassOf(created, created + HOUR, "none")).toEqual(expected); // 가입 한 시간 뒤 · 지웠다 깔아 로그인해도 끝은 같다
  expect(welcomePassOf(created, created + WELCOME_PASS_MS - 1, "none")).toEqual(expected);
  expect(WELCOME_PASS_MS).toBe(24 * HOUR);
});

test("WP-U3 생성 뒤 24시간이 지난 회원은 이용권 없음", () => {
  const created = 100 * HOUR;
  expect(welcomePassOf(created, created + WELCOME_PASS_MS, "none")).toBeUndefined();
  expect(welcomePassOf(created, created + 30 * 24 * HOUR, "none")).toBeUndefined();
});

test("WP-U4 기기 저장소 기준(시작 시각 기록 · 쓰던 기기 판정)은 걷어냈다", () => {
  expect(welcomePass).not.toHaveProperty("welcomePassStorageKey");
  expect(welcomePass).not.toHaveProperty("noteWelcomePass");
  expect(welcomePass).not.toHaveProperty("welcomePassStartedAtMs");
});

test("WP-U5 두 시간 한정 이용권은 늦게 끝나는 쪽 하나", () => {
  const a = { kind: "timed", startedAtMs: 0, endsAtMs: 5 } as const;
  const b = { kind: "timed", startedAtMs: 1, endsAtMs: 9 } as const;
  expect(laterTimedPass(a, b)).toBe(b);
  expect(laterTimedPass(b, a)).toBe(b);
  expect(laterTimedPass(a, undefined)).toBe(a);
  expect(laterTimedPass(undefined, b)).toBe(b);
  expect(laterTimedPass(undefined, undefined)).toBeUndefined();
});

test("WP-U6 무제한 판정은 푸시 보상 · 첫날 이용권 중 하나라도 살아 있으면 참이고 서로 지우지 않는다", () => {
  setWelcomeTicketPass(100);
  expect(rewardTicketPassActive(50)).toBe(true);
  setRewardTicketPass(0);
  expect(rewardTicketPassActive(50)).toBe(true);
  expect(rewardTicketPassActive(100)).toBe(false);
  setRewardTicketPass(200);
  setWelcomeTicketPass(0);
  expect(rewardTicketPassActive(150)).toBe(true);
});

// 개정 2(2026-11-25 사용자 「이미 구독한 사람한텐 뜨면 안된다」): 활성 구독이 하나라도 있으면 첫날 무제한은 없고,
// 구독 상태를 아직 모르는 동안 칩 · 모달은 그리지 않되 티켓은 쓰지 않습니다(사용자에게 손해 없는 쪽).

const entitlementsOf = (
  tier: PlanEntitlements["tier"],
  unlimitedTickets: boolean,
  ids: readonly ("chat_plus" | "premium" | "unlimited_tickets")[],
): PlanEntitlements => ({
  tier,
  unlimitedTickets,
  entitlements: ids.map((id) => ({
    id,
    productId: `duru.${id}.monthly.v1`,
    status: "active",
    willRenew: true,
    expiresAt: "2099-01-01T00:00:00Z",
  })),
});

test("WP-U7 구독 상태 — 권한 줄이 하나라도 있으면 요금제 종류와 상관없이 active, 빈 권한은 none", () => {
  expect(subscriptionStateOf(true, entitlementsOf("chat_plus", false, ["chat_plus"]))).toBe(
    "active",
  );
  expect(subscriptionStateOf(true, entitlementsOf("free", true, ["unlimited_tickets"]))).toBe(
    "active",
  );
  expect(subscriptionStateOf(true, entitlementsOf("premium", true, ["premium"]))).toBe("active");
  expect(subscriptionStateOf(true, entitlementsOf("free", false, []))).toBe("none");
  // 줄이 없어도 등급 · 티켓 무제한이 서 있으면 구독으로 봅니다(서버가 줄을 거르는 경우).
  expect(subscriptionStateOf(true, entitlementsOf("chat_plus", false, []))).toBe("active");
  expect(subscriptionStateOf(true, entitlementsOf("free", true, []))).toBe("active");
});

test("WP-U8 구독 상태 — 권한을 읽을 수 있는데 아직(또는 실패로) 없으면 unknown, 읽을 수 없는 빌드는 none", () => {
  expect(subscriptionStateOf(true, null)).toBe("unknown");
  expect(subscriptionStateOf(false, null)).toBe("none");
  expect(subscriptionStateOf(false, entitlementsOf("premium", true, ["premium"]))).toBe("none");
});

test("WP-U9 구독 중이거나 구독 상태를 모르면 첫날 칩 · 모달의 이용권은 없다 — 구독 없음일 때만", () => {
  const created = 100 * HOUR;
  const expected = { kind: "timed", startedAtMs: created, endsAtMs: created + WELCOME_PASS_MS };
  expect(welcomePassOf(created, created + HOUR, "active")).toBeUndefined();
  expect(welcomePassOf(created, created + HOUR, "unknown")).toBeUndefined();
  expect(welcomePassOf(created, created + HOUR, "none")).toEqual(expected);
});

test("WP-U10 티켓 판정의 첫날 끝 시각 — 구독 중이면 0, 모르면 그대로(차감하지 않음), 구독이 끝나면 24시간 안에서 다시", () => {
  const created = 100 * HOUR;
  expect(welcomeTicketUntilMs(created, "active")).toBe(0);
  expect(welcomeTicketUntilMs(created, "unknown")).toBe(created + WELCOME_PASS_MS);
  expect(welcomeTicketUntilMs(created, "none")).toBe(created + WELCOME_PASS_MS);
  expect(welcomeTicketUntilMs(null, "unknown")).toBe(0);
  expect(welcomeTicketUntilMs(null, "none")).toBe(0);
});
