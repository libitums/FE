import { expect, test } from "vitest";

import {
  lessonCompleteAnnouncement,
  lessonCompleteSubtitle,
  lessonCompleteTitle,
  lessonMistakeCount,
  lessonStreakLabel,
} from "./lesson-complete";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

test("[LC1] 실수 수는 정답이 아닌 결과의 수다", () => {
  expect(lessonMistakeCount([])).toBe(0);
  expect(lessonMistakeCount(["correct", "correct"])).toBe(0);
  expect(lessonMistakeCount(["correct", "incorrect", "incorrect"])).toBe(2);
});

test("[LC2] 실수가 없으면 PERFECT, 있으면 LESSON COMPLETE다", () => {
  expect(lessonCompleteTitle(0)).toBe("PERFECT LESSON!");
  expect(lessonCompleteTitle(1)).toBe("LESSON COMPLETE!");
});

test("[LC3] 설명은 실수 수에 따라 단수 · 복수가 갈린다", () => {
  expect(lessonCompleteSubtitle(0)).toBe("YOU MADE NO MISTAKES IN THIS LESSON");
  expect(lessonCompleteSubtitle(1)).toBe("YOU MADE 1 MISTAKE IN THIS LESSON");
  expect(lessonCompleteSubtitle(3)).toBe("YOU MADE 3 MISTAKES IN THIS LESSON");
});

test("[LC4] 연속 라벨과 낭독 문구", () => {
  expect(lessonStreakLabel(1)).toBe("1 Day Streak");
  expect(lessonCompleteAnnouncement(0)).toBe("학습 완료, 실수 없음");
  expect(lessonCompleteAnnouncement(2)).toBe("학습 완료, 실수 2개");
});
