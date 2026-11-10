import { expect, test } from "vitest";

import { calendarDateOf, unlimitedPassView } from "./unlimited-pass";

// `unit` 계층: 무제한 상태 → 모달이 그릴 모양(ADR-0115). 날짜는 기기 지역 시간이라 표본도 지역 시간으로 짓습니다.

const DAY = 24 * 60 * 60 * 1000;
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();

test("UP1. 시험 계정은 guest다", () => {
  expect(unlimitedPassView({ kind: "guest" }, at(2026, 11, 9))).toEqual({ kind: "guest" });
});

test("UP2. 자동 갱신이면 renews — 갱신 날 = 끝 날, 시작 날, 요금제 이름(없으면 null)", () => {
  const pass = {
    kind: "subscription",
    startedAtMs: at(2026, 10, 9),
    endsAtMs: at(2026, 12, 9),
    autoRenews: true,
    planLabel: "PLUS",
  } as const;
  expect(unlimitedPassView(pass, at(2026, 11, 9))).toEqual({
    kind: "renews",
    on: { year: 2026, month: 12, day: 9 },
    since: { year: 2026, month: 10, day: 9 },
    planLabel: "PLUS",
  });
  const { planLabel: _omit, ...unnamed } = pass;
  expect(unlimitedPassView(unnamed, at(2026, 11, 9))).toMatchObject({ planLabel: null });
});

test("UP3. 갱신 꺼짐 · 3일 남음 · 30일 기간 → ending-soon", () => {
  const ends = at(2026, 11, 12);
  const view = unlimitedPassView(
    { kind: "subscription", startedAtMs: ends - 30 * DAY, endsAtMs: ends, autoRenews: false },
    ends - 3 * DAY,
  );
  expect(view).toEqual({
    kind: "ending-soon",
    on: { year: 2026, month: 11, day: 12 },
    daysLeft: 3,
    totalDays: 30,
    remaining: 0.1,
    planLabel: null,
  });
});

test("UP4. 갱신 꺼짐 · 10일 남음 → ends", () => {
  const ends = at(2026, 11, 19);
  expect(
    unlimitedPassView(
      { kind: "subscription", startedAtMs: ends - 30 * DAY, endsAtMs: ends, autoRenews: false },
      ends - 10 * DAY,
    ),
  ).toEqual({ kind: "ends", on: { year: 2026, month: 11, day: 19 }, planLabel: null });
});

test("UP5. 정확히 7일이면 ending-soon, 7일하고 조금이면(올림 8) ends", () => {
  const ends = at(2026, 11, 19);
  const pass = {
    kind: "subscription",
    startedAtMs: ends - 30 * DAY,
    endsAtMs: ends,
    autoRenews: false,
  } as const;
  expect(unlimitedPassView(pass, ends - 7 * DAY)).toMatchObject({
    kind: "ending-soon",
    daysLeft: 7,
  });
  expect(unlimitedPassView(pass, ends - 7 * DAY - 1).kind).toBe("ends");
});

test("UP6. 끝난 뒤에는 ending-soon · 0일 · 비율 0", () => {
  const ends = at(2026, 11, 12);
  expect(
    unlimitedPassView(
      { kind: "subscription", startedAtMs: ends - 30 * DAY, endsAtMs: ends, autoRenews: false },
      ends + DAY,
    ),
  ).toMatchObject({ kind: "ending-soon", daysLeft: 0, remaining: 0 });
});

test("UP7. 남은 날은 올림이다 — 2.5일이면 3", () => {
  const ends = at(2026, 11, 12);
  expect(
    unlimitedPassView(
      { kind: "subscription", startedAtMs: ends - 30 * DAY, endsAtMs: ends, autoRenews: false },
      ends - 2.5 * DAY,
    ),
  ).toMatchObject({ daysLeft: 3 });
});

test("UP8. calendarDateOf는 지역 시간의 달력 날짜이고 month는 1~12다", () => {
  expect(calendarDateOf(at(2026, 1, 31, 0))).toEqual({ year: 2026, month: 1, day: 31 });
  expect(calendarDateOf(at(2026, 12, 1, 23))).toEqual({ year: 2026, month: 12, day: 1 });
});
