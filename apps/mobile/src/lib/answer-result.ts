// 판정 어휘의 정본입니다. 문항 하나의 판정("정답"/"오답")을 화면 넷(듣기 · 평가 ·
// 문장 순서 · 단어 선택)이 공유합니다. 낱말 표는 이 모듈 안에만 두고 export하지
// 않습니다 — 밖으로 나가는 것은 타입 하나 + 함수 하나뿐이고, 화면의 판정 로직
// (`judgeAnswer` 류)은 여기 두지 않습니다.

/** 문항 하나의 판정입니다. 이분법입니다. */
export type AnswerResult = "correct" | "incorrect";

// 표는 이 모듈 안에만 있습니다 — export하지 않습니다. 승격 전 네 자리(`listening.ts` ·
// `ListeningChoice.tsx` · `assessment.ts` · `AssessmentItem.tsx`)가 쓰던 값 그대로입니다
// — 승격은 이동이지 재작명이 아닙니다.
const labelByResult: Record<AnswerResult, string> = {
  correct: "정답",
  incorrect: "오답",
};

export function answerResultLabel(result: AnswerResult): string {
  return labelByResult[result];
}
