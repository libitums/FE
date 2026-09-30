import { expect, test } from "vitest";

import type { AnswerResult } from "../../lib/answer-result";
import {
  isPerfectLesson,
  lessonCompleteAnnouncement,
  lessonCompleteSubtitle,
  lessonCompleteTitle,
  lessonMistakeCount,
  lessonStreakLabel,
} from "./lesson-complete";
import { uiCopyEn } from "../../lib/ui-copy-en";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

test("[LC1] 실수 수는 정답이 아닌 결과의 수다", () => {
  expect(lessonMistakeCount([])).toBe(0);
  expect(lessonMistakeCount(["correct", "correct"])).toBe(0);
  expect(lessonMistakeCount(["correct", "incorrect", "incorrect"])).toBe(2);
});

test("[LC2] 통과는 실수 수로 제목이 갈리고, 미통과는 실수 수와 무관하게 FAILED다", () => {
  expect(lessonCompleteTitle(0, "passed", 0)).toBe("PERFECT LESSON!");
  expect(lessonCompleteTitle(1, "passed", 0)).toBe("LESSON COMPLETE!");
  // 미통과에서 실수 0은 나올 수 없지만, 제목이 **판정을 먼저 본다**는 것을 짓습니다 —
  // 실수 수로 먼저 가르면 「실수 없는 미통과」가 PERFECT로 뜹니다.
  expect(lessonCompleteTitle(0, "failed", 0)).toBe("LESSON FAILED");
  expect(lessonCompleteTitle(2, "failed", 0)).toBe("LESSON FAILED");
});

test("[LC3] 설명은 실수 수에 따라 단수 · 복수가 갈린다", () => {
  expect(lessonCompleteSubtitle(0)).toBe("YOU MADE NO MISTAKES IN THIS LESSON");
  expect(lessonCompleteSubtitle(1)).toBe("YOU MADE 1 MISTAKE IN THIS LESSON");
  expect(lessonCompleteSubtitle(3)).toBe("YOU MADE 3 MISTAKES IN THIS LESSON");
});

test("[LC4] 연속 라벨과 낭독 문구", () => {
  expect(lessonStreakLabel(1)).toBe("1 Day Streak");
  expect(lessonCompleteAnnouncement(0, "passed", 0, uiCopyEn)).toBe("Lesson complete, no mistakes");
  expect(lessonCompleteAnnouncement(2, "passed", 0, uiCopyEn)).toBe("Lesson complete, 2 mistakes");
});

// 낭독은 앞부터 들립니다 — 통과 여부가 실수 수보다 먼저 나와야 합니다.
test("[LC5b] 건너뛴 문항이 붙는 순서와 단수 — RL15", () => {
  expect(lessonCompleteAnnouncement(2, "failed", 1, uiCopyEn)).toBe(
    "Lesson not passed, 2 mistakes, 1 skipped question",
  );
});

test("[LC5] 미통과 낭독은 「학습 미통과」로 시작한다", () => {
  expect(lessonCompleteAnnouncement(2, "failed", 0, uiCopyEn)).toBe(
    "Lesson not passed, 2 mistakes",
  );
  expect(lessonCompleteAnnouncement(2, "failed", 0, uiCopyEn).startsWith("Lesson not passed")).toBe(
    true,
  );
});

// ------------------------------------------------- 만점과 건너뛴 문항 (D8 · C13)
//
// **통과에는 세고 만점에는 안 셉니다.** 건너뛴 말하기 문항은 `results`에 `correct`로
// 실려 통과 계산(`judgeAssessment`)에 들어가지만, 만점 판정은 그 수를 따로 봅니다.
// 두 판정이 `results` 하나를 공유하던 것을 가른 자리입니다.

test("[U-P1] 만점은 실수 0과 같은 말이 아니다 — 건너뛴 문항이 있으면 만점이 아니다", () => {
  expect(isPerfectLesson(0, 0)).toBe(true);
  // ⚠ 여기가 D8이 새로 여는 자리입니다. 실수는 0인데 만점이 아닙니다 — 틀리지는
  // 않았지만 **재지 않은** 문항이 있습니다.
  expect(isPerfectLesson(0, 1)).toBe(false);
  expect(isPerfectLesson(0, 3)).toBe(false);
  // 실수가 있으면 건너뛴 것이 없어도 만점이 아닙니다 — 옛 규칙이 그대로 삽니다.
  expect(isPerfectLesson(1, 0)).toBe(false);
  expect(isPerfectLesson(2, 3)).toBe(false);
});

// ⚠ **이 조합이 참이라는 것을 박습니다.** 화면에 `LESSON COMPLETE!` 와
// `YOU MADE NO MISTAKES IN THIS LESSON` 이 함께 섭니다. 어긋나 보이지만 어긋나지
// 않았습니다 — 제목이 세는 것은 「흠 없이 끝냈는가」이고 부제가 세는 것은 「틀린
// 횟수」라, 「틀리지는 않았지만 다 풀지도 않았다」가 두 문장으로 정확히 표현된
// 것입니다. 부제를 건너뛴 수까지 세게 고치면 *"YOU MADE 3 MISTAKES"* 가 거짓말이
// 됩니다.
test("[U-P2] 건너뛴 문항이 있으면 제목은 LESSON COMPLETE!이고 부제는 실수 없음 그대로다", () => {
  expect(lessonCompleteTitle(0, "passed", 3)).toBe("LESSON COMPLETE!");
  expect(lessonCompleteSubtitle(0)).toBe("YOU MADE NO MISTAKES IN THIS LESSON");

  // 건너뛴 것이 0으로 돌아오면 다시 만점입니다 — 제목이 실수 수 하나만 보던 옛
  // 동작이 그 자리에 그대로 남아 있습니다.
  expect(lessonCompleteTitle(0, "passed", 0)).toBe("PERFECT LESSON!");
  // 미통과가 제일 먼저입니다 — 건너뛴 수가 그 순서를 뒤집지 않습니다.
  expect(lessonCompleteTitle(0, "failed", 3)).toBe("LESSON FAILED");
});

// ⚠ **시각과 낭독이 같은 것을 말해야 합니다**(WCAG 1.3.1). 제목에 `LESSON COMPLETE!`
// (만점 아님)가 서는데 낭독이 *"Lesson complete, no mistakes"* 에서 멈추면, 보는 사람과 듣는
// 사람이 **다른 정보**를 받습니다.
//
// ⚠ 정확한 문면은 계약이 예시로만 적었습니다(*"학습 완료, 실수 없음, 건너뛴 문항 3개"*).
// 그래서 낱말을 통째로 박지 않고 **무엇이 실려야 하는가**만 답니다 — 앞부분은 그대로이고,
// 건너뛴 수가 뒤에 붙습니다.
test("[U-P3] 낭독에 건너뛴 문항 수가 실린다 — 시각과 낭독이 같은 것을 말한다", () => {
  const announcement = lessonCompleteAnnouncement(0, "passed", 3, uiCopyEn);

  expect(announcement.startsWith("Lesson complete, no mistakes")).toBe(true);
  expect(announcement).not.toBe("Lesson complete, no mistakes");
  expect(announcement).toBe("Lesson complete, no mistakes, 3 skipped questions");

  // 건너뛴 것이 없으면 덧붙지 않습니다 — 없는 수를 읽어 주지 않습니다.
  expect(lessonCompleteAnnouncement(0, "passed", 0, uiCopyEn)).toBe("Lesson complete, no mistakes");
});

// 두 수가 **다른 것**을 셉니다: 하나는 틀린 횟수, 하나는 재지 않은 횟수입니다. 건너뛴
// 문항은 `results`에 `correct`로 실리므로 실수 수에 잡히지 않고, 그래서 만점 판정에
// 건너뛴 수를 **따로** 넘겨야 합니다. 한 배열에서 둘을 다 뽑으려 하면 이 자리가 조용히
// 어긋납니다.
test("[U-P4] 실수 수는 건너뛴 문항을 세지 않는다 — 만점 판정만 그 수를 따로 본다", () => {
  // 말하기 셋을 전부 건너뛴 세션의 결과입니다(U-K4).
  const skippedAllThree: readonly AnswerResult[] = ["correct", "correct", "correct"];

  expect(lessonMistakeCount(skippedAllThree)).toBe(0);
  expect(lessonCompleteSubtitle(lessonMistakeCount(skippedAllThree))).toBe(
    "YOU MADE NO MISTAKES IN THIS LESSON",
  );
  // 같은 `results`인데 건너뛴 수가 다르면 만점 판정이 갈립니다 — `results` 하나로는
  // 원리적으로 가를 수 없는 자리입니다.
  expect(isPerfectLesson(lessonMistakeCount(skippedAllThree), 3)).toBe(false);
  expect(isPerfectLesson(lessonMistakeCount(skippedAllThree), 0)).toBe(true);
});
