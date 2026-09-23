import { expect, test } from "vitest";

import { answerResultLabel } from "./answer-result";

// `answerResultLabel`이 돌려주는 문자열이 바뀌면, 승격 전 네 자리(listening.ts ·
// ListeningChoice.tsx · assessment.ts · AssessmentItem.tsx)가 쓰던 표시 문구가 함께
// 바뀝니다. 표(Record)를 이 테스트에서 다시 만들지 않고 함수를 불러 문자열과
// 비교합니다.

test("correct는 정답이다", () => {
  expect(answerResultLabel("correct")).toBe("정답");
});

test("incorrect는 오답이다", () => {
  expect(answerResultLabel("incorrect")).toBe("오답");
});
