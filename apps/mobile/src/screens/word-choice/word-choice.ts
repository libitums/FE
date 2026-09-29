// 단어 선택 학습 화면의 순수 로직과 고정 데이터를 소유합니다(ADR-0006 D4 —
// 순수 로직은 unit 계층 대상입니다). UI를 import하지 않습니다 — 화면 폴더에
// 있지만 화면 컴포넌트를 참조하지 않는 순수 모듈입니다.
//
// listening.ts의 choiceResultAt과 이름이 겹치지만 **listening.ts에서
// import하지 않습니다** — 세션 리듀서는 승격하지 않습니다. 문자 그대로 같아
// 보여도 각자 자기 모듈에 구현합니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { AnswerResult } from "../../lib/answer-result";
import type { WordChoiceQuestion } from "./word-choice-questions";

// 문항 타입과 고정 데이터는 옆 파일이 집니다. 소비자가 아는 모듈은 여전히 이것
// 하나입니다 — 듣기가 `listening.ts`에서 같은 일을 합니다.
export * from "./word-choice-questions";

// ---------------------------------------------------------------- 도메인 타입

export type WordChoiceSessionState = {
  readonly questionIndex: number;
  readonly selectedChoiceIndex: number | null;
  readonly answeredChoiceIndexes: readonly number[];
};

export type WordChoiceSessionAction =
  | { readonly type: "selectChoice"; readonly choiceIndex: number }
  | { readonly type: "nextQuestion" };

export const initialWordChoiceSessionState: WordChoiceSessionState = {
  questionIndex: 0,
  selectedChoiceIndex: null,
  answeredChoiceIndexes: [],
};

// ---------------------------------------------------------------- 순수 함수
// 전부 부수효과가 없습니다. 방어 분기를 두지 않습니다 — Record가 다섯
// 스텝을 전부 갖는 것은 tsc가 지고, 범위 밖 입력에도 아래 식이 그대로
// 적용됩니다.

// 일치 비교라 answerIndex가 0인 문항에서도 0번 보기가 correct로 나옵니다 —
// 0을 거짓으로 다루는 자리를 만들지 않습니다.
export function judgeWordChoice(question: WordChoiceQuestion, choiceIndex: number): AnswerResult {
  return choiceIndex === question.answerIndex ? "correct" : "incorrect";
}

// 판정을 지는 보기는 고른 하나뿐입니다 — 고르지 않은 보기는 정답이어도
// null입니다.
//
// 미응답(selectedChoiceIndex === null)은 어떤 choiceIndex와도 같지 않으므로
// 아래 한 줄에 함께 들어갑니다. 0번 보기를 골랐을 때도 0 === 0이라 판정이
// 나옵니다 — truthy 검사를 쓰면 0번 보기가 조용히 미응답으로 읽힙니다.
export function choiceResultAt(
  state: WordChoiceSessionState,
  question: WordChoiceQuestion,
  choiceIndex: number,
): AnswerResult | null {
  if (state.selectedChoiceIndex !== choiceIndex) {
    return null;
  }
  return judgeWordChoice(question, choiceIndex);
}

// 접미사는 lib/answer-result.ts의 answerResultLabel이 냅니다. 구분자는
// 쉼표 + 공백입니다(ADR-0016 D3). 판정이 없는 경우는 접미사를 붙이지
// 않습니다 — 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이
// 됩니다.
export function optionAccessibilityLabel(
  text: string,
  result: AnswerResult | null,
  copy: UiCopy,
): string {
  if (result === null) {
    return text;
  }
  return `${text}, ${copy.common.answerResultSuffix[result]}`;
}

// 응답 여부는 파생입니다. null 비교라 0번 보기도 응답으로 셉니다.
/**
 * 고른 보기의 판정입니다 — 카드 안 배지가 쓰는 값입니다.
 *
 * 미응답이면 던집니다. 옵셔널로 돌려주면 「아직 안 골랐다」와 「고른 답이 오답이다」를
 * 부르는 쪽이 다시 가려야 하고, 그 갈래가 화면에 두 번째로 생깁니다 — 배지는
 * `hasAnswered`가 참일 때만 그려지므로 그 갈래는 이미 화면에 하나 있습니다.
 * (듣기의 같은 이름 함수와 같은 형태입니다.)
 */
export function answeredResultOf(
  state: WordChoiceSessionState,
  question: WordChoiceQuestion,
): AnswerResult {
  const selected = state.selectedChoiceIndex;
  if (selected === null) {
    throw new Error("아직 고르지 않은 문항의 판정을 물었습니다");
  }
  return judgeWordChoice(question, selected);
}

export function hasAnswered(state: WordChoiceSessionState): boolean {
  return state.selectedChoiceIndex !== null;
}

// 완료도 파생입니다 — 상태에 done을 적지 않습니다.
export function isWordChoiceSessionComplete(state: WordChoiceSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

// 세션 전이 네 줄이 이 함수의 정본입니다 — 듣기의 전이표와 같습니다. 변화
// 없으면 같은 참조를 돌려줍니다 — navReducer · stepSheetReducer ·
// listeningSessionReducer와 같은 규약입니다.
//
// 막는 자리가 여기 하나입니다. "이미 응답했는가"는 상태 안에 전부 있으므로
// 컴포넌트에 두 번째 게이트를 두지 않습니다.
export function wordChoiceSessionReducer(
  state: WordChoiceSessionState,
  action: WordChoiceSessionAction,
): WordChoiceSessionState {
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
// 이력의 각 응답을 그 자리 문항으로 판정합니다. judgeWordChoice를 다시 쓰지
// 않고 부릅니다 — 판정의 정본은 여전히 하나입니다. 이력이 문항 수보다 짧으면
// 짧은 쪽 길이로 끝납니다(던지지 않습니다).
export function wordChoiceSessionResults(
  questions: readonly WordChoiceQuestion[],
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
    results.push(judgeWordChoice(question, choiceIndex));
  }
  return results;
}

// ---------------------------------------------------------------- 완료 전이 발화

/**
 * 완료 전이의 발화 문자열입니다. 구분자는 쉼표+공백 — D3이 고른 부호를 그대로
 * 씁니다(`평가 결과, 통과` · `채점 결과, 정답`과 같은 형태).
 *
 * 인자는 **완료 상태에서 유일한 조작 단위의 라벨**입니다. 발화는 떠다니므로
 * *무엇이* 끝났는지(앞절)와 *이제 무엇이 남았는지*(뒷절)가 소리 안에 있어야
 * 합니다.
 *
 * 앞절은 리터럴을 다시 적지 않고 문구표 `copy.common.allQuestionsDone`을 지납니다 —
 * 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 표를 지납니다.**
 */
export function wordChoiceCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}
