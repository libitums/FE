import { expect, test } from "vitest";

import { streakRewardCollected, streakRewardRecordFrom } from "./streak-reward-record";

// `unit` 계층(SR-U5): 연속 학습 보상을 받았다는 기기 기록(ADR-0143).

test("SR-U5a 같은 일수를 그날이나 다음 날(오늘 학습 전) 보면 받은 것, 이틀 뒤 · 다른 일수 · 기록 없음은 아님", () => {
  const record = { days: 7, day: "2026-11-14" };
  expect(streakRewardCollected(record, 7, "2026-11-14")).toBe(true);
  expect(streakRewardCollected(record, 7, "2026-11-15")).toBe(true);
  expect(streakRewardCollected(record, 7, "2026-11-16")).toBe(false);
  expect(streakRewardCollected(record, 14, "2026-11-14")).toBe(false);
  expect(streakRewardCollected(record, 7, "2026-11-13")).toBe(false);
  expect(streakRewardCollected(null, 7, "2026-11-14")).toBe(false);
  // 달 · 해가 바뀌어도 하루 차이로 읽습니다.
  expect(streakRewardCollected({ days: 3, day: "2026-12-31" }, 3, "2027-01-01")).toBe(true);
});

test("SR-U5b 저장된 값 해석 — 깨진 값 · 모양이 틀린 값은 null", () => {
  expect(streakRewardRecordFrom(JSON.stringify({ days: 7, day: "2026-11-14" }))).toEqual({
    days: 7,
    day: "2026-11-14",
  });
  expect(streakRewardRecordFrom(null)).toBeNull();
  expect(streakRewardRecordFrom("")).toBeNull();
  expect(streakRewardRecordFrom("{")).toBeNull();
  expect(streakRewardRecordFrom(JSON.stringify({ days: "7", day: "2026-11-14" }))).toBeNull();
  expect(streakRewardRecordFrom(JSON.stringify({ days: 7, day: "yesterday" }))).toBeNull();
});
