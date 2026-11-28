import { expect, test } from "vitest";

import { missionPatternText, roundedScoreParts } from "./MissionReportExtras";

// `unit` 계층(MRF-U1 ~): 리포트 표시 규칙 — 점수 항 정수 반올림(합 = round(합), QA 14) · 목표 표현 자리표 빈칸(QA 8).

test("MRF-U1 점수 항은 큰 나머지 순으로 반올림해 합이 round(합)과 같다", () => {
  expect(roundedScoreParts([37.5, 25.5, 10])).toEqual([38, 25, 10]);
  expect(roundedScoreParts([50, 25.5, 20])).toEqual([50, 26, 20]);
  expect(roundedScoreParts([33.3, 33.3, 33.4])).toEqual([33, 33, 34]);
  for (const parts of [
    [12.4, 25.5, 6.7],
    [0, 0, 0],
    [49.9, 29.9, 19.9],
  ]) {
    const sum = roundedScoreParts(parts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(Math.round(parts.reduce((a, b) => a + b, 0)));
  }
});

test("MRF-U2 목표 표현의 자리표는 빈칸으로", () => {
  expect(missionPatternText("{음료} 한 잔 주세요.")).toBe("___ 한 잔 주세요.");
  expect(missionPatternText("Please give me one {drink}.")).toBe("Please give me one ___.");
  expect(missionPatternText("카드로 할게요.")).toBe("카드로 할게요.");
});
