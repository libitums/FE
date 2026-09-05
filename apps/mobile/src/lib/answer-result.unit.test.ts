import { expect, test } from "vitest";

import { answerResultLabel } from "./answer-result";

// 계약: .agent-harness/work/lib-229/spec.md §3.1 (unit — required, 작업 단위 W1)
// · §1.4(d) 판정 어휘의 정본. 형태의 정본: ./storage.unit.test.ts
//
// 단언은 계약 §3.1이 이 한 줄로 고정했다 — 두 값의 문자열 동등.
// `정답` · `오답`은 승격 전 네 자리(listening.ts · ListeningChoice.tsx · assessment.ts ·
// AssessmentItem.tsx)가 쓰던 값 그대로다 — 승격은 이동이지 재작명이 아니다(§1.4(d)).
// 표(Record)를 이 테스트에서 다시 만들지 않는다. 함수를 부르고 문자열과 비교한다.

test("correct는 정답이다", () => {
  expect(answerResultLabel("correct")).toBe("정답");
});

test("incorrect는 오답이다", () => {
  expect(answerResultLabel("incorrect")).toBe("오답");
});
