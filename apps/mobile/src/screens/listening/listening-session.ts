// 듣기 학습 화면의 세션 상태·리듀서·정오 판정을 소유합니다. UI를
// import하지 않습니다.

import { type AnswerResult } from "../../lib/answer-result";
import type { ListeningQuestion } from "./listening-questions";

// 완료도 판정 결과도 응답 여부도 상태에 적지 않습니다 — 전부 파생입니다
// (isSessionComplete · choiceResultAt · hasAnswered).
//
// `answeredChoiceIndexes`가 응답 이력을 집니다. 적는 것은 「고른 보기」이지
// 「판정」이 아닙니다 — 정오는 여전히 judgeAnswer가 문항 데이터에서
// 파생합니다(sessionAnswerResults).
export type ListeningSessionState = {
  readonly questionIndex: number;
  readonly selectedChoiceIndex: number | null;
  readonly answeredChoiceIndexes: readonly number[];
};

export type ListeningSessionAction =
  | { readonly type: "selectChoice"; readonly choiceIndex: number }
  | { readonly type: "nextQuestion" };

export const initialListeningSessionState: ListeningSessionState = {
  questionIndex: 0,
  selectedChoiceIndex: null,
  answeredChoiceIndexes: [],
};

// ---------------------------------------------------------------- 순수 함수
// 전부 부수효과가 없습니다. 방어 분기를 두지 않습니다 — Record가 다섯
// 스텝을 전부 갖는 것은 tsc가 지고, 범위 밖 입력에도 아래 식이 그대로
// 적용됩니다.

// 일치 비교라 answerIndex가 0인 문항에서도 0번 보기가 correct로
// 나옵니다 — 0을 거짓으로 다루는 자리를 만들지 않습니다.
export function judgeAnswer(question: ListeningQuestion, choiceIndex: number): AnswerResult {
  return choiceIndex === question.answerIndex ? "correct" : "incorrect";
}

// 판정을 지는 보기는 **고른 하나뿐**입니다 — 고르지 않은 보기는 정답이어도
// null입니다.
//
// 미응답(selectedChoiceIndex === null)은 어떤 choiceIndex와도 같지 않으므로
// 아래 한 줄에 함께 들어갑니다. 0번 보기를 골랐을 때도 0 === 0이라 판정이
// 나옵니다 — truthy 검사를 쓰면 0번 보기가 조용히 미응답으로 읽힙니다.
export function choiceResultAt(
  state: ListeningSessionState,
  question: ListeningQuestion,
  choiceIndex: number,
): AnswerResult | null {
  if (state.selectedChoiceIndex !== choiceIndex) {
    return null;
  }
  return judgeAnswer(question, choiceIndex);
}

// 응답 여부는 파생입니다. null 비교라 0번 보기도 응답으로 셉니다.
export function hasAnswered(state: ListeningSessionState): boolean {
  return state.selectedChoiceIndex !== null;
}

// 완료도 파생입니다 — 상태에 done을 적지 않습니다.
export function isSessionComplete(state: ListeningSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

// 전이표 네 줄이 이 함수의 정본입니다. 변화 없으면 같은 참조를 돌려줍니다
// — navReducer · stepSheetReducer와 같은 규약입니다.
//
// **막는 자리가 여기 하나입니다.** "이미 응답했는가"는 상태 안에 전부
// 있으므로 컴포넌트에 두 번째 게이트를 두지 않습니다.
//
// `nextQuestion`이 이력을 쌓는 넷째 줄입니다(`{ i, c, a } → { i+1, null, [...a, c] }`).
// 이력이 느는 자리는 여기 하나입니다 — `selectChoice`에서 함께 넣으면 같은
// 응답이 두 곳에 삽니다.
export function listeningSessionReducer(
  state: ListeningSessionState,
  action: ListeningSessionAction,
): ListeningSessionState {
  switch (action.type) {
    case "selectChoice": {
      if (hasAnswered(state)) {
        return state;
      }
      return {
        questionIndex: state.questionIndex,
        selectedChoiceIndex: action.choiceIndex,
        answeredChoiceIndexes: state.answeredChoiceIndexes,
      };
    }
    case "nextQuestion": {
      const { selectedChoiceIndex } = state;
      if (selectedChoiceIndex === null) {
        return state;
      }
      return {
        questionIndex: state.questionIndex + 1,
        selectedChoiceIndex: null,
        answeredChoiceIndexes: [...state.answeredChoiceIndexes, selectedChoiceIndex],
      };
    }
  }
}

// ---------------------------------------------------------------- 이력 → 판정
// 이력의 각 응답을 그 자리 문항으로 판정합니다. judgeAnswer를 다시 쓰지
// 않고 부릅니다 — 판정의 정본은 여전히 하나입니다. 이력이 문항 수보다 짧으면
// 짧은 쪽 길이로 끝납니다(던지지 않습니다).
export function sessionAnswerResults(
  questions: readonly ListeningQuestion[],
  answeredChoiceIndexes: readonly number[],
): readonly AnswerResult[] {
  const length = Math.min(questions.length, answeredChoiceIndexes.length);
  const results: AnswerResult[] = [];
  for (let index = 0; index < length; index += 1) {
    const question = questions[index];
    const choiceIndex = answeredChoiceIndexes[index];
    if (question === undefined || choiceIndex === undefined) {
      break;
    }
    results.push(judgeAnswer(question, choiceIndex));
  }
  return results;
}
