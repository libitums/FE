import { describe, expect, test } from "vitest";

import type { PushRewardClaim } from "../lib/push-reward-api";
import {
  emptyPushRewardRecord,
  pushRewardFailure,
  pushRewardGuideOn,
  pushRewardHoldsLater,
  pushRewardPassOf,
  pushRewardRecordAfter,
  pushRewardRecordFrom,
  pushRewardStep,
  pushRewardStorageKey,
  type PushRewardRecord,
} from "./push-reward-record";

// `unit` 계층(PR-U5 ~ U10): 푸시 캠페인 보상의 판정 · 기기 기록(ADR-0175).

const HOUR = 3_600_000;
const NOW = 1_800_000_000_000;

const coins = (status: PushRewardClaim["status"] = "granted"): PushRewardClaim => ({
  status,
  campaignId: "c1",
  reward: { kind: "coins", amount: 100 },
  balance: 130,
});
const tickets = (
  untilMs: number,
  status: PushRewardClaim["status"] = "granted",
): PushRewardClaim => ({
  status,
  campaignId: "c2",
  reward: { kind: "tickets", hours: 24, untilMs },
  balance: 5,
});
const nothing = (status: PushRewardClaim["status"]): PushRewardClaim => ({
  status,
  campaignId: null,
  reward: null,
  balance: null,
});

describe("PR-U5 기록 읽기", () => {
  test("열쇠는 계정마다", () => {
    expect(pushRewardStorageKey("u1")).toBe("libitum.push-reward.u1");
  });

  test("모달 · 이용권을 읽고, 틀린 칸은 버린다", () => {
    const record: PushRewardRecord = {
      modal: { kind: "tickets", hours: 24 },
      pass: { startedAtMs: NOW, untilMs: NOW + 24 * HOUR },
    };
    expect(pushRewardRecordFrom(JSON.stringify(record))).toEqual(record);
    expect(
      pushRewardRecordFrom(JSON.stringify({ modal: { kind: "coins", amount: 100 }, pass: null })),
    ).toEqual({ modal: { kind: "coins", amount: 100 }, pass: null });
    expect(
      pushRewardRecordFrom(
        JSON.stringify({ modal: { kind: "coins", amount: -3 }, pass: { untilMs: "x" } }),
      ),
    ).toEqual(emptyPushRewardRecord);
    expect(pushRewardRecordFrom(null)).toEqual(emptyPushRewardRecord);
    expect(pushRewardRecordFrom("{")).toEqual(emptyPushRewardRecord);
    expect(pushRewardRecordFrom("null")).toEqual(emptyPushRewardRecord);
  });
});

describe("PR-U6 응답 뒤 기록", () => {
  test("엽전을 받으면 모달 대기", () => {
    expect(pushRewardRecordAfter(emptyPushRewardRecord, coins(), NOW)).toEqual({
      modal: { kind: "coins", amount: 100 },
      pass: null,
    });
  });

  test("티켓을 받으면 모달 대기 + 이용권(지금부터 끝까지)", () => {
    expect(pushRewardRecordAfter(emptyPushRewardRecord, tickets(NOW + 24 * HOUR), NOW)).toEqual({
      modal: { kind: "tickets", hours: 24 },
      pass: { startedAtMs: NOW, untilMs: NOW + 24 * HOUR },
    });
  });

  test("살아 있는 이용권에 이어 받으면 시작은 그대로, 끝은 늦은 쪽", () => {
    const before: PushRewardRecord = {
      modal: null,
      pass: { startedAtMs: NOW - 2 * HOUR, untilMs: NOW + 22 * HOUR },
    };
    expect(pushRewardRecordAfter(before, tickets(NOW + 46 * HOUR), NOW).pass).toEqual({
      startedAtMs: NOW - 2 * HOUR,
      untilMs: NOW + 46 * HOUR,
    });
  });

  test("끝난 이용권 뒤에 받으면 새로 시작", () => {
    const before: PushRewardRecord = {
      modal: null,
      pass: { startedAtMs: NOW - 30 * HOUR, untilMs: NOW - 6 * HOUR },
    };
    expect(pushRewardRecordAfter(before, tickets(NOW + 24 * HOUR), NOW).pass).toEqual({
      startedAtMs: NOW,
      untilMs: NOW + 24 * HOUR,
    });
  });

  test("이미 받은 티켓은 모달 없이 이용권만 되살리고(다른 기기 · 재설치), 끝났으면 그대로", () => {
    expect(
      pushRewardRecordAfter(emptyPushRewardRecord, tickets(NOW + 5 * HOUR, "already_claimed"), NOW),
    ).toEqual({
      modal: null,
      pass: { startedAtMs: NOW + 5 * HOUR - 24 * HOUR, untilMs: NOW + 5 * HOUR },
    });
    expect(
      pushRewardRecordAfter(emptyPushRewardRecord, tickets(NOW - HOUR, "already_claimed"), NOW),
    ).toEqual(emptyPushRewardRecord);
  });

  test("이미 받은 엽전 · 대상 아님 · 기한 지남 · 모름 · 없음은 바꾸지 않는다", () => {
    const before: PushRewardRecord = { modal: { kind: "coins", amount: 50 }, pass: null };
    for (const claim of [
      coins("already_claimed"),
      nothing("not_recipient"),
      nothing("expired"),
      nothing("unknown"),
      nothing("none"),
    ]) {
      expect(pushRewardRecordAfter(before, claim, NOW)).toBe(before);
    }
  });
});

describe("PR-U7 모달 때", () => {
  const pending: PushRewardRecord = { modal: { kind: "coins", amount: 100 }, pass: null };
  test("로그인 · 한가 · 안내 꺼짐 · 대기 모달이 있을 때만", () => {
    const base = { signedIn: true, record: pending, idle: true, guideOn: false };
    expect(pushRewardStep(base)).toBe("modal");
    expect(pushRewardStep({ ...base, signedIn: false })).toBeNull();
    expect(pushRewardStep({ ...base, idle: false })).toBeNull();
    expect(pushRewardStep({ ...base, guideOn: true })).toBeNull();
    expect(pushRewardStep({ ...base, record: emptyPushRewardRecord })).toBeNull();
  });

  test("첫 유닛 안내는 활동이 하나도 없을 때만 — 튜토리얼 중간이면 꺼짐", () => {
    expect(pushRewardGuideOn({}, false)).toBe(true);
    expect(pushRewardGuideOn({ u00: [] }, false)).toBe(true);
    expect(pushRewardGuideOn({ u00: ["intro"] }, false)).toBe(false);
    expect(pushRewardGuideOn({}, true)).toBe(false);
  });
});

describe("PR-U8 뒤 안내 미루기", () => {
  test("묻는 중 · 모달 대기 · 날기 동안만", () => {
    const pending: PushRewardRecord = { modal: { kind: "coins", amount: 100 }, pass: null };
    expect(
      pushRewardHoldsLater({ claiming: true, record: emptyPushRewardRecord, flying: false }),
    ).toBe(true);
    expect(pushRewardHoldsLater({ claiming: false, record: pending, flying: false })).toBe(true);
    expect(
      pushRewardHoldsLater({ claiming: false, record: emptyPushRewardRecord, flying: true }),
    ).toBe(true);
    expect(
      pushRewardHoldsLater({ claiming: false, record: emptyPushRewardRecord, flying: false }),
    ).toBe(false);
  });
});

describe("PR-U9 실패 이유", () => {
  test("받음은 null, 판정은 그대로, 응답 없음은 error", () => {
    expect(pushRewardFailure(coins(), "c1")).toBeNull();
    expect(pushRewardFailure(nothing("expired"), "c1")).toBe("expired");
    expect(pushRewardFailure(nothing("not_recipient"), "c1")).toBe("not_recipient");
    expect(pushRewardFailure(coins("already_claimed"), "c1")).toBe("already_claimed");
    expect(pushRewardFailure(nothing("unknown"), "c1")).toBe("unknown");
    expect(pushRewardFailure(null, null)).toBe("error");
  });

  test("캠페인 id 없이 물어 보상이 없으면(보상 없는 알림) 이벤트가 없다", () => {
    expect(pushRewardFailure(nothing("none"), null)).toBeNull();
    expect(pushRewardFailure(nothing("none"), "c1")).toBe("none");
  });
});

describe("PR-U10 보상 이용권의 판", () => {
  test("끝 시각 전이면 timed, 끝났거나 없으면 undefined", () => {
    const record: PushRewardRecord = {
      modal: null,
      pass: { startedAtMs: NOW, untilMs: NOW + 24 * HOUR },
    };
    expect(pushRewardPassOf(record, NOW + HOUR)).toEqual({
      kind: "timed",
      startedAtMs: NOW,
      endsAtMs: NOW + 24 * HOUR,
    });
    expect(pushRewardPassOf(record, NOW + 24 * HOUR)).toBeUndefined();
    expect(pushRewardPassOf(emptyPushRewardRecord, NOW)).toBeUndefined();
  });
});
