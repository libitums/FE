import { describe, expect, test } from "vitest";

import {
  FREE_TURNS_PER_DAY,
  dayKeyOf,
  msUntilNextDay,
  parseTurnRecord,
  recordFreeSend,
  recordOutPanelShown,
  resetClockOf,
  sendGateFor,
  turnPlanFor,
  turnUsageOf,
  type TurnPlan,
  type TurnRecord,
  type TurnUsage,
} from "./free-turns";

// `unit` 계층(MC2-U1 ~ U7): 하루 무료 수 · 날짜 키 · 남은 시간 · 저장 파서 · T1~T4 계획 · 보내기 관문
// (messenger-chat-1-5 spec §4.1). 시계는 인자로만 받는다 — 지역 시각은 new Date(y, m, d, h, mi)로 만든다.

const at = (y: number, m: number, d: number, h = 0, mi = 0, s = 0, ms = 0): number =>
  new Date(y, m - 1, d, h, mi, s, ms).getTime();

describe("dayKeyOf · msUntilNextDay (MC2-U1)", () => {
  test("MC2-U1. 자정 직전 마지막 ms 는 그날, 다음 ms 는 다음 날이다", () => {
    expect(dayKeyOf(at(2026, 11, 10, 23, 59, 59, 999))).toBe("2026-11-10");
    expect(dayKeyOf(at(2026, 11, 11, 0, 0, 0, 0))).toBe("2026-11-11");
  });

  test("MC2-U1. 월 · 일을 두 자리로 0 채운다 — 1월 1일 · 2월 29일", () => {
    expect(dayKeyOf(at(2026, 1, 1, 0, 0))).toBe("2026-01-01");
    expect(dayKeyOf(at(2028, 2, 29, 12, 0))).toBe("2028-02-29");
  });

  test("MC2-U1. 23:00 에서 다음 날까지 3,600,000 ms 다", () => {
    expect(msUntilNextDay(at(2026, 11, 10, 23, 0))).toBe(3_600_000);
  });

  test("MC2-U1. 00:00 에서 다음 날까지 86,400,000 ms 다", () => {
    expect(msUntilNextDay(at(2026, 11, 10, 0, 0))).toBe(86_400_000);
  });

  test.each([
    ["평일 한낮", at(2026, 11, 10, 13, 17, 5, 250)],
    ["자정 직전", at(2026, 11, 10, 23, 59, 59, 999)],
    ["자정", at(2026, 11, 10, 0, 0, 0, 0)],
    ["봄 DST 전환일 근처(미국 3월 8일)", at(2026, 3, 8, 1, 30)],
    ["가을 DST 전환일 근처(미국 11월 1일)", at(2026, 11, 1, 0, 30)],
  ] as const)("MC2-U1. %s: now + ms 는 다음 날이고 1 ms 전은 같은 날이다", (_label, now) => {
    const ms = msUntilNextDay(now);
    expect(ms).toBeGreaterThanOrEqual(1);
    expect(dayKeyOf(now + ms)).not.toBe(dayKeyOf(now));
    expect(dayKeyOf(now + ms - 1)).toBe(dayKeyOf(now));
  });
});

describe("resetClockOf (MC2-U2)", () => {
  test.each([
    [1, 0, 1],
    [60_000, 0, 1],
    [60_001, 0, 2],
    [3_600_000, 1, 0],
    [18_720_000, 5, 12],
  ] as const)("MC2-U2. %s ms → %sh %sm (분 올림)", (ms, hours, minutes) => {
    expect(resetClockOf(ms)).toEqual({ hours, minutes });
  });

  test.each([[0], [-1], [-60_000], [Number.NaN]])("MC2-U2. %s → 0h 0m", (ms) => {
    expect(resetClockOf(ms)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("parseTurnRecord (MC2-U3)", () => {
  const good: TurnRecord = { day: "2026-11-10", used: 2, outPanel: "due" };

  test("MC2-U3. 올바른 값은 그대로 통과한다 — used 0 · shown 도", () => {
    expect(parseTurnRecord(good)).toEqual(good);
    expect(parseTurnRecord({ day: "2026-01-01", used: 0, outPanel: "shown" })).toEqual({
      day: "2026-01-01",
      used: 0,
      outPanel: "shown",
    });
  });

  test.each([
    ["day 꼴 틀림(하이픈 없음)", { ...good, day: "20261110" }],
    ["day 꼴 틀림(자리 수)", { ...good, day: "2026-1-1" }],
    ["day 가 숫자", { ...good, day: 20261110 }],
    ["day 없음", { used: 1, outPanel: "due" }],
    ["used 음수", { ...good, used: -1 }],
    ["used 소수", { ...good, used: 1.5 }],
    ["used 문자열", { ...good, used: "2" }],
    ["used NaN", { ...good, used: Number.NaN }],
    ["outPanel 모르는 값", { ...good, outPanel: "open" }],
    ["outPanel 없음", { day: good.day, used: 1 }],
    ["null", null],
    ["undefined", undefined],
    ["배열", [good]],
    ["숫자", 3],
    ["문자열(JSON 아님)", "not json"],
  ] as const)("MC2-U3. %s → null 이고 던지지 않는다", (_label, raw) => {
    expect(() => parseTurnRecord(raw)).not.toThrow();
    expect(parseTurnRecord(raw)).toBeNull();
  });
});

describe("turnUsageOf (MC2-U4)", () => {
  const today = "2026-11-10";

  test("MC2-U4. 기록이 없으면 3 남고 표시 대기(due)다", () => {
    expect(turnUsageOf(null, today)).toEqual({
      day: today,
      used: 0,
      remaining: 3,
      outPanel: "due",
    });
  });

  test("MC2-U4. 같은 날 2 썼으면 1 남는다", () => {
    expect(turnUsageOf({ day: today, used: 2, outPanel: "due" }, today)).toEqual({
      day: today,
      used: 2,
      remaining: 1,
      outPanel: "due",
    });
  });

  test("MC2-U4. 같은 날 5 썼어도 남은 수는 0 이다(음수 아님)", () => {
    const usage = turnUsageOf({ day: today, used: 5, outPanel: "shown" }, today);
    expect(usage.remaining).toBe(0);
    expect(usage.used).toBe(5);
    expect(usage.outPanel).toBe("shown");
  });

  test("MC2-U4. 다른 날 기록은 새 날 3 이고 판 표시도 due 로 돌아간다(자정 초기화)", () => {
    expect(turnUsageOf({ day: "2026-11-09", used: 3, outPanel: "shown" }, today)).toEqual({
      day: today,
      used: 0,
      remaining: 3,
      outPanel: "due",
    });
  });

  test("MC2-U4. 하루 수를 주입할 수 있다", () => {
    expect(turnUsageOf(null, today, 5).remaining).toBe(5);
    expect(turnUsageOf({ day: today, used: 1, outPanel: "due" }, today, 5).remaining).toBe(4);
  });

  test("MC2-U4. 기본 하루 수는 FREE_TURNS_PER_DAY(3) 다", () => {
    expect(FREE_TURNS_PER_DAY).toBe(3);
  });
});

describe("recordFreeSend · recordOutPanelShown (MC2-U5)", () => {
  const today = "2026-11-10";

  test("MC2-U5. recordFreeSend: 같은 날이면 used + 1 이고 판 표시는 이어진다", () => {
    expect(recordFreeSend({ day: today, used: 1, outPanel: "due" }, today)).toEqual({
      day: today,
      used: 2,
      outPanel: "due",
    });
    expect(recordFreeSend({ day: today, used: 3, outPanel: "shown" }, today)).toEqual({
      day: today,
      used: 4,
      outPanel: "shown",
    });
  });

  test("MC2-U5. recordFreeSend: 다른 날 · null 이면 used 1 · due 다", () => {
    expect(recordFreeSend({ day: "2026-11-09", used: 3, outPanel: "shown" }, today)).toEqual({
      day: today,
      used: 1,
      outPanel: "due",
    });
    expect(recordFreeSend(null, today)).toEqual({ day: today, used: 1, outPanel: "due" });
  });

  test("MC2-U5. recordOutPanelShown: 같은 날이면 shown 이고 used 는 그대로다", () => {
    expect(recordOutPanelShown({ day: today, used: 3, outPanel: "due" }, today)).toEqual({
      day: today,
      used: 3,
      outPanel: "shown",
    });
  });

  test("MC2-U5. recordOutPanelShown: 다른 날 · null 이면 used 0 · shown 이다", () => {
    expect(recordOutPanelShown({ day: "2026-11-09", used: 3, outPanel: "due" }, today)).toEqual({
      day: today,
      used: 0,
      outPanel: "shown",
    });
    expect(recordOutPanelShown(null, today)).toEqual({ day: today, used: 0, outPanel: "shown" });
  });

  test("MC2-U5. 입력 객체를 바꾸지 않는다", () => {
    const record: TurnRecord = { day: today, used: 1, outPanel: "due" };
    const frozen = Object.freeze({ ...record });
    expect(() => recordFreeSend(frozen, today)).not.toThrow();
    expect(() => recordOutPanelShown(frozen, today)).not.toThrow();
    expect(frozen).toEqual(record);
    const next = recordFreeSend(record, today);
    expect(next).not.toBe(record);
    expect(next.used).toBe(2);
    expect(record).toEqual({ day: today, used: 1, outPanel: "due" });
  });
});

describe("turnPlanFor (MC2-U6)", () => {
  const usage = (remaining: number, outPanel: "due" | "shown" = "due"): TurnUsage => ({
    day: "2026-11-10",
    used: 3 - remaining,
    remaining,
    outPanel,
  });
  const plan = (tier: "free" | "unlimited", u: TurnUsage, total?: number): TurnPlan =>
    turnPlanFor({ tier, usage: u, price: 10, ...(total === undefined ? {} : { total }) });

  test.each([[3], [2], [1], [0]])("MC2-U6. 무제한은 남은 수 %s 여도 unlimited 다", (remaining) => {
    expect(plan("unlimited", usage(remaining, "shown"))).toEqual({ kind: "unlimited" });
  });

  test("MC2-U6. 남은 3 · 2 → free(T1)", () => {
    expect(plan("free", usage(3))).toEqual({ kind: "free", remaining: 3, total: 3 });
    expect(plan("free", usage(2))).toEqual({ kind: "free", remaining: 2, total: 3 });
  });

  test("MC2-U6. 남은 1 → last-free(T2) 이고 가격이 실린다", () => {
    expect(plan("free", usage(1))).toEqual({ kind: "last-free", total: 3, price: 10 });
  });

  test("MC2-U6. 남은 0 + due → coin due(T3), shown → coin shown(T4)", () => {
    expect(plan("free", usage(0, "due"))).toEqual({ kind: "coin", price: 10, outPanel: "due" });
    expect(plan("free", usage(0, "shown"))).toEqual({
      kind: "coin",
      price: 10,
      outPanel: "shown",
    });
  });

  test("MC2-U6. total 을 주입하면 계획에 실린다", () => {
    expect(plan("free", usage(2), 5)).toEqual({ kind: "free", remaining: 2, total: 5 });
    expect(plan("free", usage(1), 5)).toEqual({ kind: "last-free", total: 5, price: 10 });
  });
});

describe("sendGateFor (MC2-U7)", () => {
  test("MC2-U7. 무제한 → open", () => {
    expect(sendGateFor({ kind: "unlimited" }, 0)).toEqual({ kind: "open" });
  });

  test("MC2-U7. free · last-free → free(잔액 무관)", () => {
    expect(sendGateFor({ kind: "free", remaining: 2, total: 3 }, 0)).toEqual({ kind: "free" });
    expect(sendGateFor({ kind: "last-free", total: 3, price: 10 }, 0)).toEqual({ kind: "free" });
  });

  const coin: TurnPlan = { kind: "coin", price: 10, outPanel: "shown" };

  test("MC2-U7. coin + 잔액 10 → pay 10 이고, 더 많아도 pay 다", () => {
    expect(sendGateFor(coin, 10)).toEqual({ kind: "pay", price: 10 });
    expect(sendGateFor(coin, 100)).toEqual({ kind: "pay", price: 10 });
  });

  test("MC2-U7. coin + 잔액 9 → top-up 모자람 1", () => {
    expect(sendGateFor(coin, 9)).toEqual({ kind: "top-up", price: 10, shortBy: 1 });
  });

  test.each([[Number.NaN], [-5], [0]])("MC2-U7. 잔액 %s → top-up 모자람 10", (balance) => {
    expect(sendGateFor(coin, balance)).toEqual({ kind: "top-up", price: 10, shortBy: 10 });
  });
});
