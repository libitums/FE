// 판정 어휘의 정본입니다. 문항 하나의 판정(correct/incorrect)을 앱의 화면들과 랜딩 체험판이
// 공유합니다. 보이는 낱말은 각 소비자의 문구표가 냅니다 — 이 모듈은 타입 하나뿐입니다.

/** 문항 하나의 판정입니다. 이분법입니다. */
export type AnswerResult = "correct" | "incorrect";
