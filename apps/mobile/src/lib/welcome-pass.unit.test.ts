import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { authSessionStorageKey } from "./auth-session";
import { firstOpenDayStorageKey } from "./first-open";
import { guestSessionStorageKey } from "./guest-session";
import {
  rewardTicketPassActive,
  setRewardTicketPass,
  setWelcomeTicketPass,
} from "./reward-ticket-pass";
import {
  WELCOME_PASS_MS,
  laterTimedPass,
  noteWelcomePass,
  welcomePassOf,
  welcomePassStartFrom,
  welcomePassStartedAtMs,
  welcomePassStorageKey,
} from "./welcome-pass";

// 첫날 무제한 티켓(ADR-0186) — 시작 시각 기록 · 이용권 판정입니다.

const HOUR = 3_600_000;
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, v: string) => void store.set(k, v),
      remove: (k: string) => void store.delete(k),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setRewardTicketPass(0);
  setWelcomeTicketPass(0);
});

test("WP-U1 첫 실행(첫 실행일 기록 없음)이면 시작 시각을 적고, 다시 불러도 바꾸지 않는다", () => {
  noteWelcomePass(1_000);
  expect(store.get(welcomePassStorageKey)).toBe("1000");
  noteWelcomePass(9_000);
  expect(welcomePassStartedAtMs()).toBe(1_000);
});

test.each([
  ["첫 실행일", firstOpenDayStorageKey, "2026-11-14"],
  ["로그인 세션", authSessionStorageKey, "{}"],
  ["비회원 표식", guestSessionStorageKey, "1"],
])("WP-U2 쓰던 기기(%s이 이미 있음)는 받지 않는다", (_label, key, value) => {
  store.set(key, value);
  noteWelcomePass(1_000);
  expect(store.has(welcomePassStorageKey)).toBe(false);
  expect(welcomePassStartedAtMs()).toBeNull();
});

test("WP-U3 저장소가 없으면 적지도 읽지도 않는다 — 이용권 없음", () => {
  vi.unstubAllGlobals();
  expect(() => noteWelcomePass(1_000)).not.toThrow();
  expect(welcomePassStartedAtMs()).toBeNull();
});

test.each([null, "", "abc", "-5", "0", "1.5", "1e9", "9999999999999999"])(
  "WP-U4 틀린 저장 글 %s는 시작 시각이 아니다",
  (raw) => {
    expect(welcomePassStartFrom(raw)).toBeNull();
  },
);

test("WP-U5 시작부터 24시간 동안 timed 이용권 — 끝나는 순간부터 없음", () => {
  const start = 10 * HOUR;
  expect(welcomePassOf(start, start)).toEqual({
    kind: "timed",
    startedAtMs: start,
    endsAtMs: start + WELCOME_PASS_MS,
  });
  expect(welcomePassOf(start, start + WELCOME_PASS_MS - 1)).toBeDefined();
  expect(welcomePassOf(start, start + WELCOME_PASS_MS)).toBeUndefined();
  expect(welcomePassOf(null, start)).toBeUndefined();
  expect(WELCOME_PASS_MS).toBe(24 * HOUR);
});

test("WP-U6 두 시간 한정 이용권은 늦게 끝나는 쪽 하나", () => {
  const a = { kind: "timed", startedAtMs: 0, endsAtMs: 5 } as const;
  const b = { kind: "timed", startedAtMs: 1, endsAtMs: 9 } as const;
  expect(laterTimedPass(a, b)).toBe(b);
  expect(laterTimedPass(b, a)).toBe(b);
  expect(laterTimedPass(a, undefined)).toBe(a);
  expect(laterTimedPass(undefined, b)).toBe(b);
  expect(laterTimedPass(undefined, undefined)).toBeUndefined();
});

test("WP-U7 무제한 판정은 푸시 보상 · 첫날 이용권 중 하나라도 살아 있으면 참이고 서로 지우지 않는다", () => {
  setWelcomeTicketPass(100);
  expect(rewardTicketPassActive(50)).toBe(true);
  setRewardTicketPass(0); // 로그아웃 — 푸시 보상 쪽만 지움
  expect(rewardTicketPassActive(50)).toBe(true);
  expect(rewardTicketPassActive(100)).toBe(false);
  setRewardTicketPass(200);
  setWelcomeTicketPass(0);
  expect(rewardTicketPassActive(150)).toBe(true);
});
