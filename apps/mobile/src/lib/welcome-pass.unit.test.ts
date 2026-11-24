import { afterEach, expect, test } from "vitest";

import type { AuthSession } from "./auth-session.contract";
import {
  rewardTicketPassActive,
  setRewardTicketPass,
  setWelcomeTicketPass,
} from "./reward-ticket-pass";
import * as welcomePass from "./welcome-pass";
import { WELCOME_PASS_MS, laterTimedPass, welcomePassOf, welcomePassStartOf } from "./welcome-pass";

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
  expect(welcomePassOf(welcomePassStartOf(null), 0)).toBeUndefined();
});

test("WP-U2 회원의 시작 시각은 계정 생성 시각이고, 생성 뒤 24시간 안이면 그 끝까지 timed 이용권", () => {
  const created = 100 * HOUR;
  expect(welcomePassStartOf(session(created))).toBe(created);
  const expected = { kind: "timed", startedAtMs: created, endsAtMs: created + WELCOME_PASS_MS };
  expect(welcomePassOf(created, created)).toEqual(expected);
  expect(welcomePassOf(created, created + HOUR)).toEqual(expected); // 가입 한 시간 뒤 · 지웠다 깔아 로그인해도 끝은 같다
  expect(welcomePassOf(created, created + WELCOME_PASS_MS - 1)).toEqual(expected);
  expect(WELCOME_PASS_MS).toBe(24 * HOUR);
});

test("WP-U3 생성 뒤 24시간이 지난 회원은 이용권 없음", () => {
  const created = 100 * HOUR;
  expect(welcomePassOf(created, created + WELCOME_PASS_MS)).toBeUndefined();
  expect(welcomePassOf(created, created + 30 * 24 * HOUR)).toBeUndefined();
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
