import { describe, expect, test } from "vitest";

import {
  flightCoinCount,
  signupRewardHoldsLaunch,
  signupRewardRecordAfter,
  signupRewardRecordFrom,
  signupRewardStep,
  signupRewardStorageKey,
} from "./signup-reward-record";

// `unit` 계층(SR-U3 ~ U7): 가입 보상의 판정 · 기기 기록(ADR-0174).

test("SR-U3 기록 읽기 — 계정마다 키, 모양이 틀리면 null", () => {
  expect(signupRewardStorageKey("user-1")).toBe("libitum.signup-reward.user-1");
  expect(signupRewardRecordFrom(JSON.stringify({ amount: 100, shown: false }))).toEqual({
    amount: 100,
    shown: false,
  });
  expect(signupRewardRecordFrom(JSON.stringify({ amount: 0, shown: true }))).toEqual({
    amount: 0,
    shown: true,
  });
  expect(signupRewardRecordFrom(null)).toBeNull();
  expect(signupRewardRecordFrom("")).toBeNull();
  expect(signupRewardRecordFrom("{")).toBeNull();
  expect(signupRewardRecordFrom(JSON.stringify({ amount: "100", shown: false }))).toBeNull();
  expect(signupRewardRecordFrom(JSON.stringify({ amount: -5, shown: false }))).toBeNull();
  // shown이 참이 아니면 안 본 것으로 읽는다.
  expect(signupRewardRecordFrom(JSON.stringify({ amount: 100 }))).toEqual({
    amount: 100,
    shown: false,
  });
});

test("SR-U4 지급 뒤 기록 — 이번에 받았으면 모달 대기, 아니면 끝난 것으로", () => {
  expect(signupRewardRecordAfter({ granted: 100, balance: 100 })).toEqual({
    amount: 100,
    shown: false,
  });
  expect(signupRewardRecordAfter({ granted: 0, balance: 470 })).toEqual({
    amount: 0,
    shown: true,
  });
});

describe("SR-U5 지금 무엇을 그리나", () => {
  const pending = { amount: 100, shown: false };
  const done = { amount: 100, shown: true };
  test.each([
    ["guest", null, true, "card"],
    ["guest", null, false, null],
    ["guest", pending, true, "card"],
    ["signed-out", null, true, null],
    ["signed-in", null, true, null],
    ["signed-in", pending, true, "modal"],
    ["signed-in", pending, false, null],
    ["signed-in", done, true, null],
  ] as const)("%s · 기록 %o · 한가 %s → %s", (account, record, idle, step) => {
    expect(signupRewardStep({ account, record, idle, tutorialDone: true })).toBe(step);
  });

  test("모달은 튜토리얼을 끝낸 뒤에만 — 카드는 그 전에도", () => {
    expect(
      signupRewardStep({ account: "signed-in", record: pending, idle: true, tutorialDone: false }),
    ).toBeNull();
    expect(
      signupRewardStep({ account: "guest", record: null, idle: true, tutorialDone: false }),
    ).toBe("card");
  });
});

describe("SR-U6 엽전 출시 지급을 미루나", () => {
  test.each([
    // 로그인했고 이 계정의 지급을 아직 묻지 않았으면 미룬다 — 가입 보상이 먼저.
    ["signed-in", null, false, false, true],
    // 물었는데 실패했으면(기록 없음) 막지 않는다 — RPC가 아직 없는 서버에서도 출시 모달이 선다.
    ["signed-in", null, true, false, false],
    ["signed-in", { amount: 100, shown: false }, true, false, true],
    ["signed-in", { amount: 100, shown: true }, true, true, true],
    ["signed-in", { amount: 0, shown: true }, true, false, false],
    ["guest", null, false, false, false],
    ["signed-out", null, false, false, false],
  ] as const)("%s · %o · 물음 %s · 날기 %s → %s", (account, record, attempted, flying, held) => {
    expect(signupRewardHoldsLaunch({ account, record, attempted, flying })).toBe(held);
  });
});

test("SR-U7 날기 동안 칩 — 닿은 몫만큼 오르고 넘치지 않는다", () => {
  expect(flightCoinCount(30, 100, 0, 6)).toBe(30);
  expect(flightCoinCount(30, 100, 3, 6)).toBe(80);
  expect(flightCoinCount(30, 100, 1, 6)).toBe(47);
  expect(flightCoinCount(30, 100, 6, 6)).toBe(130);
  expect(flightCoinCount(30, 100, 9, 6)).toBe(130);
  expect(flightCoinCount(0, 100, 1, 0)).toBe(100);
});
