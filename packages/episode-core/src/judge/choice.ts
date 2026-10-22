// 보기 고르기 판정입니다(순수).

import type { AnswerResult } from "./answer-result";

// 일치 비교라 answerIndex가 0인 문항에서도 0번 보기가 correct로 나옵니다 —
// 0을 거짓으로 다루는 자리를 만들지 않습니다.
export function judgeChoice(answerIndex: number, choiceIndex: number): AnswerResult {
  return choiceIndex === answerIndex ? "correct" : "incorrect";
}
