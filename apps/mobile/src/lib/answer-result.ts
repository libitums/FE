// 판정 어휘의 정본. 문항 하나의 판정("정답"/"오답")을 화면 넷(듣기 · 평가 · 문장 순서 ·
// 단어 선택)이 공유한다 (계약 .agent-harness/work/lib-229/spec.md §1.4).
//
// 낱말 표는 이 모듈 안에만 있다 — export하지 않는다 (§1.4(b)). 밖으로 나가는 것은
// 타입 하나 + 함수 하나뿐이다. 화면의 판정 로직(`judgeAnswer` 류)은 여기 두지 않는다
// (§1.4(d)).

/** 문항 하나의 판정. 이분법이다(계약 §1.3). */
export type AnswerResult = "correct" | "incorrect";

// 표는 이 모듈 안에만 있다 — export하지 않는다 (§1.4(b)). 승격 전 네 자리
// (listening.ts · ListeningChoice.tsx · assessment.ts · AssessmentItem.tsx)가 쓰던
// 값 그대로다 — 승격은 이동이지 재작명이 아니다 (§1.4(d)).
const labelByResult: Record<AnswerResult, string> = {
  correct: "정답",
  incorrect: "오답",
};

export function answerResultLabel(result: AnswerResult): string {
  return labelByResult[result];
}
