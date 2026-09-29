// 판정 어휘의 정본입니다. 문항 하나의 판정(correct/incorrect)을 화면 넷(듣기 · 평가 ·
// 문장 순서 · 단어 선택)이 공유합니다. 보이는 낱말은 문구표(`copy.common.answerResult` ·
// `answerResultSuffix`)가 냅니다 — 이 모듈은 타입 하나뿐이고, 화면의 판정 로직
// (`judgeAnswer` 류)은 여기 두지 않습니다.

/** 문항 하나의 판정입니다. 이분법입니다. */
export type AnswerResult = "correct" | "incorrect";
