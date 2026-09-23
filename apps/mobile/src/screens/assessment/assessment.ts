// 평가 화면의 순수 로직과 통과 기준 상수를 소유합니다(ADR-0006 D4 — 순수 로직은
// unit 계층 대상입니다). UI를 import하지 않습니다.

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";

// ---------------------------------------------------------------- 도메인 타입

export type AssessmentVerdict = "passed" | "failed";

export type AssessmentPassCriterion = {
  readonly minCorrectCount: number;
};

// ---------------------------------------------------------------- 통과 기준 상수
// 문항 셋 중 2 이상 맞히면 통과입니다. 이 상수는 값으로 고정된 데이터이지 동작이
// 아닙니다. 두 번째 자리도 폴백도 두지 않습니다.
export const assessmentPassCriterion: AssessmentPassCriterion = { minCorrectCount: 2 };

// ---------------------------------------------------------------- 순수 함수 일곱
// 전부 부수효과가 없습니다.

// 맞은 개수는 이 함수 안에서만 삽니다 — export하지 않습니다. 던지지 않습니다 —
// 빈 배열도 total이고 맞은 개수 0으로 판정됩니다.
export function judgeAssessment(
  results: readonly AnswerResult[],
  criterion: AssessmentPassCriterion,
): AssessmentVerdict {
  const correctCount = results.filter((result) => result === "correct").length;
  return correctCount >= criterion.minCorrectCount ? "passed" : "failed";
}

// `${ordinal}단계 · 평가` 형태입니다 — 구분자는 가운뎃점 양옆 공백입니다.
export function assessmentScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 평가`;
}

// 판정 표입니다. export하지 않는 모듈 내부 표입니다 — journey-map.ts의
// stepStatusSuffix와 같은 형태입니다. "다시 도전"·"아쉬워요" 류를 두지 않습니다.
const verdictLabel: Record<AssessmentVerdict, string> = {
  passed: "통과",
  failed: "미통과",
};

export function assessmentVerdictLabel(verdict: AssessmentVerdict): string {
  return verdictLabel[verdict];
}

// `문항 ${index + 1}` 형태입니다 — index는 0-based입니다.
export function assessmentItemTitle(index: number): string {
  return `문항 ${index + 1}`;
}

// 접미사는 lib/answer-result.ts의 answerResultLabel이 냅니다 — listening.ts의
// choiceAccessibilityLabel · ListeningChoice.tsx와 같은 정본을 씁니다.
export function assessmentItemAccessibilityLabel(index: number, result: AnswerResult): string {
  return `${assessmentItemTitle(index)}, ${answerResultLabel(result)}`;
}

// 낭독 문자열입니다. 보이는 판정 낱말을 그대로 담습니다 — 화면과 소리가 다른
// 앱이 되지 않도록 같은 verdictLabel 표를 지납니다. 구분자는 쉼표 + 공백입니다
// (ADR-0016 D3).
export function assessmentAnnouncement(verdict: AssessmentVerdict): string {
  return `평가 결과, ${assessmentVerdictLabel(verdict)}`;
}

// 완료 표입니다. `if`도 부등호도 아니라 Record입니다 — 판정이 하나 늘면 tsc가 그
// 값의 답을 쓰라고 강제합니다(journey-map.ts의 stepOpensSheet와 같은 형태). export하지
// 않습니다.
const completesStep: Record<AssessmentVerdict, boolean> = {
  passed: true,
  failed: false,
};

// 완료를 거는가를 판정합니다. ADR-0006 D4가 뒤집히면서 생겼습니다 — 셸의 `if`가
// 아니라 이 함수가 규칙을 집니다.
export function assessmentCompletesStep(verdict: AssessmentVerdict): boolean {
  return completesStep[verdict];
}
