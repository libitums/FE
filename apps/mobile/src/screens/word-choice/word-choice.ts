// 단어 선택 학습 화면의 순수 로직 + 고정 데이터 자리 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// 계약: .agent-harness/work/lib-229/spec.md §1.5(c)(타입) · §1.7(c)(순수 함수 열).
// ⚠ §1.2(a) 표는 이 파일을 "§1.7(b)"로 가리키지만 §4.5가 기록한 대로 한 칸 밀린
// 오타다 — 바른 절은 §1.7(c)다.
//
// UI를 import하지 않는다 — 화면 폴더에 있지만 화면 컴포넌트를 참조하지 않는 순수
// 모듈이다 (계약 §1.2 「왜 순수 로직이 lib/가 아니라 화면 폴더인가」).
//
// journey-map에서 가져오는 것은 **타입 하나뿐**이다 (§1.4(e) 화면 간 import 규칙 —
// import type 하나이고 그 타입의 소유자가 그 화면일 때만 허용한다).
//
// listening.ts의 choiceResultAt과 이름이 겹치지만 **listening.ts에서 import하지 않는다**
// — 세션 리듀서는 승격하지 않는다(계약 §1.4(g)). 문자 그대로 같아 보여도 각자 자기
// 모듈에 구현한다.

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입 (계약 §1.5(c))

export type WordChoiceQuestion = {
  /** 문항 제시문. 빈칸 문장이면 그 빈칸이 이 문자열 안에 있다 — 요소로 쪼개지 않는다. */
  readonly prompt: string;
  readonly choices: readonly [string, string, string, string];
  readonly answerIndex: 0 | 1 | 2 | 3;
};

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

// ---------------------------------------------------------------- 문항 데이터의 자리 (계약 §1.5(d))
//
// 값은 이 계약이 지어내지 않는다. `Record<JourneyStepId, …>` 형태가 다섯 키를 전부
// 요구하므로 다섯 키를 전부 두되 값은 빈 배열이다.
//
// 어느 스텝이 어느 학습형인가를 담을 자리가 데이터에 없고(§8.2 보류 1), 문항
// 텍스트·보기·정답 인덱스의 값도 컨텐츠가 막혀 있다(§8.2 보류 2). 둘 다 이 단위
// 밖이다 — 지어내면 그 보류를 조용히 덮는다.
export const wordChoiceQuestionsByStep: Record<JourneyStepId, readonly WordChoiceQuestion[]> = {
  greeting: [],
  introduction: [],
  ordering: [],
  appointment: [],
  directions: [],
};

// ---------------------------------------------------------------- 순수 함수 (계약 §1.7(c))
// 전부 부수효과가 없다. 방어 분기를 두지 않는다 — Record가 다섯 스텝을 전부 갖는 것은
// tsc가 지고, 범위 밖 입력에도 아래 식이 그대로 적용된다.

// 계약 §1.7(c) 표: `${ordinal}단계 · 단어 선택` — 구분자는 가운뎃점 양옆 공백이다.
export function wordChoiceScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 단어 선택`;
}

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는 총함수다
// (계약 §1.7(c) 「던지지 않는다」).
export function wordChoiceQuestionsForStep(id: JourneyStepId): readonly WordChoiceQuestion[] {
  return wordChoiceQuestionsByStep[id];
}

// 계약 §1.7(c) 표: `문항 ${index + 1} / ${total}` — index는 0-based다.
export function wordChoiceProgressLabel(index: number, total: number): string {
  return `문항 ${index + 1} / ${total}`;
}

// 계약 §1.7(c) 표 그대로. 일치 비교라 answerIndex가 0인 문항에서도 0번 보기가
// correct로 나온다 — 0을 거짓으로 다루는 자리를 만들지 않는다.
export function judgeWordChoice(question: WordChoiceQuestion, choiceIndex: number): AnswerResult {
  return choiceIndex === question.answerIndex ? "correct" : "incorrect";
}

// 판정을 지는 보기는 고른 하나뿐이다 — 고르지 않은 보기는 정답이어도 null이다
// (계약 §1.1 「정답을 알려 주지 않는다」).
//
// 미응답(selectedChoiceIndex === null)은 어떤 choiceIndex와도 같지 않으므로 아래
// 한 줄에 함께 들어간다. 0번 보기를 골랐을 때도 0 === 0이라 판정이 나온다 —
// truthy 검사를 쓰면 0번 보기가 조용히 미응답으로 읽힌다.
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

// 접미사는 lib/answer-result.ts의 answerResultLabel이 낸다 (계약 §1.4(d)).
// 구분자는 쉼표 + 공백이다 (ADR-0016 D3). 판정이 없는 경우는 접미사를 붙이지
// 않는다 — 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 된다
// (계약 §1.7(c) 마지막 문단).
export function optionAccessibilityLabel(text: string, result: AnswerResult | null): string {
  if (result === null) {
    return text;
  }
  return `${text}, ${answerResultLabel(result)}`;
}

// 응답 여부는 파생이다 (계약 §1.3(c)와 같은 규율). null 비교라 0번 보기도 응답으로 센다.
export function hasAnswered(state: WordChoiceSessionState): boolean {
  return state.selectedChoiceIndex !== null;
}

// 완료도 파생이다 — 상태에 done을 적지 않는다.
export function isWordChoiceSessionComplete(state: WordChoiceSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

// 계약 §1.7(c) 표: 세션 전이 네 줄이 이 함수의 정본이다 — 듣기의 전이표와 같다.
// 변화 없으면 같은 참조를 돌려준다 — navReducer · stepSheetReducer · listeningSessionReducer와
// 같은 규약.
//
// 막는 자리가 여기 하나다. "이미 응답했는가"는 상태 안에 전부 있으므로 컴포넌트에
// 두 번째 게이트를 두지 않는다 (계약 §1.6(a)와 같은 규율).
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

// ---------------------------------------------------------------- 이력 → 판정 (계약 §1.7(c) 표)
// 이력의 각 응답을 그 자리 문항으로 판정한다. judgeWordChoice를 다시 쓰지 않고 부른다 —
// 판정의 정본은 여전히 하나다. 이력이 문항 수보다 짧으면 짧은 쪽 길이로 끝난다
// (던지지 않는다).
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

// ---------------------------------------------------------------- 완료 전이 발화 (LIB-247 계약 §3)
// 계약: .agent-harness/work/lib-247/spec.md §3.1(export 목록) · §3.2(시그니처와 값).

/** 종료 상태 문구. 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 자리**에서 나온다 (ADR-0016 D11-1). */
export const wordChoiceCompletionText = "문항을 모두 마쳤어요";

/** 완료 상태에서 화면에 남는 **유일한 조작 단위**의 라벨. 이 화면에서는 `결과 보기`다. */
export const wordChoiceFinishLabel = "결과 보기";

/**
 * 완료 전이의 발화 문자열. 구분자는 쉼표+공백 — D3이 고른 부호를 그대로 쓴다
 * (`평가 결과, 통과` · `채점 결과, 정답`과 같은 형태).
 *
 * 인자는 **완료 상태에서 유일한 조작 단위의 라벨**이다. 발화는 떠다니므로
 * *무엇이* 끝났는지(앞절)와 *이제 무엇이 남았는지*(뒷절)가 소리 안에 있어야 한다.
 *
 * ⚠ **logic-scaffold의 무동작 몸통이다** — 계약 §6.1이 정한 대로 빈 문자열을 돌려준다.
 * 던지지 않으므로 `unit`의 U1이 「빈 문자열 vs 기대값」으로 실물 red가 된다.
 */
export function wordChoiceCompletionAnnouncement(nextActionLabel: string): string {
  // 인자를 계약이 고정한 이름 그대로 둔 채 무동작을 유지한다 — `logic` 단계가 이 줄을
  // 지우고 `${wordChoiceCompletionText}, ${nextActionLabel}`을 돌려준다.
  void nextActionLabel;
  return "";
}
