import { expect, test } from "vitest";

import {
  WELCOME_PASS_MS,
  WELCOME_SHOWN_CAP_MS,
  welcomePassOf,
  welcomePassOnShown,
  welcomePassStartFrom,
} from "./welcome-pass";

// `unit` 계층(WS-U1 ~ U6, ADR-0186 개정 4 — 사용자 결정 A 2026-11-27): 첫날 무제한의 시작은 가입 보상 창이 처음 선 시각이다.
// 창이 계정 생성 뒤 48시간 안에 섰을 때만이고, 그보다 늦었거나 이 기기에 창을 본 기록이 없으면(재설치 · 기기 변경) 계정 생성 시각이다.
// 창이 아직 앞에 있으면(튜토리얼 중 · 창 대기) 시작하지 않는다.

const HOUR = 3_600_000;
const created = 1_000 * HOUR;

test("WS-U1 창이 생성 뒤 48시간 안에 섰으면 시작은 창이 선 시각 — 끝은 그 뒤 24시간", () => {
  const shownAtMs = created + 2 * HOUR; // 튜토리얼 두 시간
  expect(welcomePassStartFrom({ accountCreatedAt: created, shownAtMs, windowAhead: false })).toBe(
    shownAtMs,
  );
  expect(welcomePassOf(shownAtMs, shownAtMs, "none")).toEqual({
    kind: "timed",
    startedAtMs: shownAtMs,
    endsAtMs: shownAtMs + WELCOME_PASS_MS,
  });
  // 경계 — 꼭 48시간이면 창 기준, 생성 순간이어도 창 기준.
  const edge = created + WELCOME_SHOWN_CAP_MS;
  expect(
    welcomePassStartFrom({ accountCreatedAt: created, shownAtMs: edge, windowAhead: false }),
  ).toBe(edge);
  expect(
    welcomePassStartFrom({ accountCreatedAt: created, shownAtMs: created, windowAhead: false }),
  ).toBe(created);
  expect(WELCOME_SHOWN_CAP_MS).toBe(48 * HOUR);
});

test("WS-U2 남용 상한 — 창이 생성 뒤 48시간이 지나 섰으면 계정 생성 기준(이미 끝남)", () => {
  const late = created + WELCOME_SHOWN_CAP_MS + 1;
  const start = welcomePassStartFrom({
    accountCreatedAt: created,
    shownAtMs: late,
    windowAhead: false,
  });
  expect(start).toBe(created);
  expect(welcomePassOf(start, late, "none")).toBeUndefined();
});

test("WS-U3 창 기록이 생성 시각보다 앞이면(시계를 되돌림) 믿지 않고 계정 생성 기준", () => {
  expect(
    welcomePassStartFrom({ accountCreatedAt: created, shownAtMs: created - 1, windowAhead: false }),
  ).toBe(created);
});

test("WS-U4 저장값 없음 — 창이 앞에 없으면(재설치 · 기기 변경 · 창이 안 서는 계정) 계정 생성 기준", () => {
  expect(
    welcomePassStartFrom({ accountCreatedAt: created, shownAtMs: null, windowAhead: false }),
  ).toBe(created);
});

test("WS-U5 창이 아직 앞에 있으면 시작하지 않는다 · 비회원(생성 시각 모름)은 언제나 없음", () => {
  expect(
    welcomePassStartFrom({ accountCreatedAt: created, shownAtMs: null, windowAhead: true }),
  ).toBeNull();
  // 창 기록이 이미 있으면 앞에 있다는 판정보다 기록이 이긴다.
  const shownAtMs = created + HOUR;
  expect(welcomePassStartFrom({ accountCreatedAt: created, shownAtMs, windowAhead: true })).toBe(
    shownAtMs,
  );
  expect(
    welcomePassStartFrom({ accountCreatedAt: null, shownAtMs, windowAhead: false }),
  ).toBeNull();
});

test("WS-U6 창이 지금 선다면의 이용권(무제한 줄) — 48시간 안이면 지금부터 24시간, 늦었거나 구독 중 · 모름이면 없음", () => {
  const now = created + 2 * HOUR;
  expect(welcomePassOnShown(created, null, now, "none")).toEqual({
    kind: "timed",
    startedAtMs: now,
    endsAtMs: now + WELCOME_PASS_MS,
  });
  expect(welcomePassOnShown(created, null, now, "active")).toBeUndefined();
  expect(welcomePassOnShown(created, null, now, "unknown")).toBeUndefined();
  expect(welcomePassOnShown(null, null, now, "none")).toBeUndefined();
  expect(welcomePassOnShown(created, null, created + 49 * HOUR, "none")).toBeUndefined();
  // 이미 적힌 기록이 있으면 그 기록이 시작이다(창이 다시 서도 늘지 않음).
  const earlier = created + HOUR;
  expect(welcomePassOnShown(created, earlier, now, "none")).toEqual({
    kind: "timed",
    startedAtMs: earlier,
    endsAtMs: earlier + WELCOME_PASS_MS,
  });
});
