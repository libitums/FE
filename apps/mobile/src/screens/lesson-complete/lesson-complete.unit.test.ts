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

test("[LC2] 통과는 실수 수로 제목이 갈리고, 미통과는 실수 수와 무관하게 FAILED다", () => {
  expect(lessonCompleteTitle(0, "passed")).toBe("PERFECT LESSON!");
  expect(lessonCompleteTitle(1, "passed")).toBe("LESSON COMPLETE!");
  // 미통과에서 실수 0은 나올 수 없지만, 제목이 **판정을 먼저 본다**는 것을 짓습니다 —
  // 실수 수로 먼저 가르면 「실수 없는 미통과」가 PERFECT로 뜹니다.
  expect(lessonCompleteTitle(0, "failed")).toBe("LESSON FAILED");
  expect(lessonCompleteTitle(2, "failed")).toBe("LESSON FAILED");
});

test("[LC3] 설명은 실수 수에 따라 단수 · 복수가 갈린다", () => {
  expect(lessonCompleteSubtitle(0)).toBe("YOU MADE NO MISTAKES IN THIS LESSON");
  expect(lessonCompleteSubtitle(1)).toBe("YOU MADE 1 MISTAKE IN THIS LESSON");
  expect(lessonCompleteSubtitle(3)).toBe("YOU MADE 3 MISTAKES IN THIS LESSON");
});

test("[LC4] 연속 라벨과 낭독 문구", () => {
  expect(lessonStreakLabel(1)).toBe("1 Day Streak");
  expect(lessonCompleteAnnouncement(0, "passed")).toBe("학습 완료, 실수 없음");
  expect(lessonCompleteAnnouncement(2, "passed")).toBe("학습 완료, 실수 2개");
});

// 낭독은 앞부터 들립니다 — 통과 여부가 실수 수보다 먼저 나와야 합니다.
test("[LC5] 미통과 낭독은 「학습 미통과」로 시작한다", () => {
  expect(lessonCompleteAnnouncement(2, "failed")).toBe("학습 미통과, 실수 2개");
  expect(lessonCompleteAnnouncement(2, "failed").startsWith("학습 미통과")).toBe(true);
});
