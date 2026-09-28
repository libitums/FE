import { expect, test } from "vitest";

import { journeyStatSlotCount, streakTrack, trophyTrack } from "./journey-stat";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

test("[JS1] 24일 연속 · 오늘 월요일이면 토요일부터 세 칸이 찬다 (디자인 예시)", () => {
  expect(streakTrack(24, 1)).toEqual({
    completedCount: 3,
    dayLabels: ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"],
  });
});

test("[JS2] 연속 7일째는 줄이 가득 차고, 8일째는 새 줄의 첫 칸이 오늘이다", () => {
  expect(streakTrack(7, 3).completedCount).toBe(journeyStatSlotCount);
  expect(streakTrack(7, 3).dayLabels?.[6]).toBe("We");
  expect(streakTrack(8, 3)).toEqual({
    completedCount: 1,
    dayLabels: ["We", "Th", "Fr", "Sa", "Su", "Mo", "Tu"],
  });
});

test("[JS3] 연속이 없으면(0 · 음수 · NaN) 빈 줄이 오늘부터 시작한다", () => {
  for (const days of [0, -2, Number.NaN]) {
    const track = streakTrack(days, 0);
    expect(track.completedCount).toBe(0);
    expect(track.dayLabels?.[0]).toBe("Su");
  }
});

test("[JS4] 트로피 줄은 얻은 수만큼 차고 7에서 멈춘다. 요일을 갖지 않는다", () => {
  expect(trophyTrack(3)).toEqual({ completedCount: 3 });
  expect(trophyTrack(12).completedCount).toBe(journeyStatSlotCount);
  expect(trophyTrack(-1).completedCount).toBe(0);
});
