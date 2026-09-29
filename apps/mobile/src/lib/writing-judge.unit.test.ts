import { expect, test } from "vitest";

import type { HandwritingTraceOutcome } from "./handwriting-trace";
import {
  judgeWriting,
  writingPassCriterion,
  writingQuestionResult,
  type WritingPassCriterion,
} from "./writing-judge";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).
//
// 문턱은 이 파일의 대역(`criterion`)으로 봅니다 — 기본값(`writingPassCriterion`)은 기기에서
// 잡을 임시값이라, 그 수를 단언하면 값이 오는 날 판정 규칙이 아니라 값 때문에 빨개집니다.

const criterion: WritingPassCriterion = { coverage: 0.5, stay: 0.8 };

function compared(coverage: number, stay: number): HandwritingTraceOutcome {
  return {
    status: "compared",
    coverage,
    stay,
    drawnArea: 100,
    guideArea: 100,
    font: "Stub",
    guideBox: "0,0,1,1",
  };
}

// WJ1 — 두 지표가 **둘 다** 문턱 이상이어야 정답입니다. 한쪽만 보면 낙서나 한 획이 통과합니다.
test("[WJ1] 두 지표가 모두 문턱 이상이면 정답, 하나라도 모자라면 오답이다", () => {
  expect(judgeWriting(compared(0.5, 0.8), criterion)).toEqual({
    kind: "judged",
    result: "correct",
  });
  expect(judgeWriting(compared(0.49, 0.9), criterion)).toEqual({
    kind: "judged",
    result: "incorrect",
  });
  expect(judgeWriting(compared(0.9, 0.79), criterion)).toEqual({
    kind: "judged",
    result: "incorrect",
  });
});

// WJ2 — 문턱은 인자에서 옵니다. 문항이 덮어쓴 문턱이 실제로 판정을 바꿉니다.
test("[WJ2] 같은 수라도 문턱이 다르면 판정이 갈린다", () => {
  const outcome = compared(0.55, 0.85);
  expect(judgeWriting(outcome, criterion)).toEqual({ kind: "judged", result: "correct" });
  expect(judgeWriting(outcome, { coverage: 0.6, stay: 0.8 })).toEqual({
    kind: "judged",
    result: "incorrect",
  });
});

// WJ3 — 「획이 없다」는 잴 수 없음이 아니라 아직 안 쓴 것입니다. 넘기면 쓴 글자를 판정받지
// 못한 채 지나갑니다.
test("[WJ3] 획이 없다는 답은 다시 쓰기로 돌린다", () => {
  expect(judgeWriting({ status: "empty-strokes" }, criterion)).toEqual({ kind: "rewrite" });
});

// WJ4 — 기기 탓은 결과에 싣지 않습니다. 오답으로 접으면 학습자 탓이 됩니다.
test.each(["empty-glyph", "invalid-arguments", "failed", "malformed"] as const)(
  "[WJ4] %s는 잴 수 없음이다",
  (status) => {
    expect(judgeWriting({ status }, criterion)).toEqual({ kind: "unmeasurable" });
  },
);

// WJ5 — 기본 문턱은 0~1 사이의 수입니다. 값 자체는 임시라 범위만 봅니다.
test("[WJ5] 기본 문턱의 두 수는 0과 1 사이다", () => {
  for (const value of [writingPassCriterion.coverage, writingPassCriterion.stay]) {
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(1);
  }
});

// WJ6 — 문항의 판정은 잰 음절 전부가 맞아야 정답이고, 잰 음절이 없으면 싣지 않습니다(`null`).
test("[WJ6] 문항 판정은 잰 음절이 모두 맞아야 정답이고, 잰 음절이 없으면 null이다", () => {
  expect(writingQuestionResult(["correct", "correct"])).toBe("correct");
  expect(writingQuestionResult(["correct", "incorrect"])).toBe("incorrect");
  expect(writingQuestionResult([])).toBeNull();
});
