// 평가 화면의 순수 로직 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// LIB-227 (logic): 계약(.agent-harness/work/lib-227/spec.md §1.3~§1.5)이 고정한
// 타입 + 순수 함수 일곱 + 통과 기준 상수를 구현한다. DOM·컴포넌트·저장소를 만지지
// 않는다.
//
// UI를 import하지 않는다 (계약 §1.7 표).

import type { ListeningAnswerResult } from "../listening/listening";

// ---------------------------------------------------------------- 도메인 타입 (계약 §1.3)

export type AssessmentVerdict = "passed" | "failed";

export type AssessmentPassCriterion = {
  readonly minCorrectCount: number;
};

// ---------------------------------------------------------------- 통과 기준 상수 (계약 §1.4)
// 값이 내려왔다 (u7) — 문항 셋 중 2 이상이면 통과다. 이 상수는 **값으로 고정된 데이터**이지
// 동작이 아니다. 두 번째 자리도 폴백도 두지 않는다 (계약 §1.4).
export const assessmentPassCriterion: AssessmentPassCriterion = { minCorrectCount: 2 };

// ---------------------------------------------------------------- 순수 함수 일곱 (계약 §1.5)
// 전부 부수효과가 없다.

// 맞은 개수는 이 함수 안에서만 산다 — export하지 않는다(계약 §1.1 · §1.5). 던지지
// 않는다: 빈 배열도 total이고 맞은 개수 0으로 판정된다.
export function judgeAssessment(
  results: readonly ListeningAnswerResult[],
  criterion: AssessmentPassCriterion,
): AssessmentVerdict {
  const correctCount = results.filter((result) => result === "correct").length;
  return correctCount >= criterion.minCorrectCount ? "passed" : "failed";
}

// 계약 §1.5 표: `${ordinal}단계 · 평가` — 구분자는 가운뎃점 양옆 공백이다.
export function assessmentScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 평가`;
}

// 판정 표 (계약 §1.5). export하지 않는 모듈 내부 표 — journey-map.ts의
// stepStatusSuffix와 같은 형태다. "다시 도전"·"아쉬워요" 류를 두지 않는다.
const verdictLabel: Record<AssessmentVerdict, string> = {
  passed: "통과",
  failed: "미통과",
};

export function assessmentVerdictLabel(verdict: AssessmentVerdict): string {
  return verdictLabel[verdict];
}

// 계약 §1.5 표: `문항 ${index + 1}` — index는 0-based다.
export function assessmentItemTitle(index: number): string {
  return `문항 ${index + 1}`;
}

// 접미사 표 (계약 §1.5). export하지 않는 모듈 내부 상수 — 낱말이 listening.ts의
// choiceResultSuffix · ListeningChoice.tsx의 markLabelByResult와 같다(계약 §1.5의
// 「같은 두 낱말의 표가 이제 셋이다」 경고).
const itemAccessibilitySuffix: Record<ListeningAnswerResult, string> = {
  correct: "정답",
  incorrect: "오답",
};

export function assessmentItemAccessibilityLabel(
  index: number,
  result: ListeningAnswerResult,
): string {
  return `${assessmentItemTitle(index)}, ${itemAccessibilitySuffix[result]}`;
}

// 낭독 문자열 (계약 §3.1). 보이는 판정 낱말을 그대로 담는다 — 화면과 소리가 다른
// 앱이 되지 않도록 같은 verdictLabel 표를 지난다. 구분자는 쉼표 + 공백(ADR-0016 D3).
export function assessmentAnnouncement(verdict: AssessmentVerdict): string {
  return `평가 결과, ${assessmentVerdictLabel(verdict)}`;
}

// 완료 표 (계약 §1.5, u7). `if`도 부등호도 아니라 Record다 — 판정이 하나 늘면 tsc가
// 그 값의 답을 쓰라고 강제한다(journey-map.ts의 stepOpensSheet와 같은 형태). export하지
// 않는다.
const completesStep: Record<AssessmentVerdict, boolean> = {
  passed: true,
  failed: false,
};

// (u7) 완료를 거는가. D4가 뒤집히면서 생겼다 — 셸의 `if`가 아니라 이 함수가 규칙을 진다
// (계약 §1.5).
export function assessmentCompletesStep(verdict: AssessmentVerdict): boolean {
  return completesStep[verdict];
}
