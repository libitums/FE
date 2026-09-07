// 문화 퀴즈 화면의 순수 로직 + 고정 데이터 자리 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// 계약: .agent-harness/work/lib-244/spec.md §3(타입·모듈 계약).
//
// LIB-244 (logic) — 계약 §3이 고정한 타입·export 이름·시그니처대로 이 모듈이 실제
// 계산을 한다. 전부 부수효과가 없고 하나도 던지지 않는다(§3.3).
//
// UI를 import하지 않는다 — 화면 폴더에 있지만 화면 컴포넌트를 참조하지 않는 순수
// 모듈이다 (culture.ts · listening.ts · word-choice.ts와 같은 형태).
//
// journey-map에서 가져오는 것은 타입 하나뿐이다(화면 간 import 규칙 — import type
// 하나이고 그 타입의 소유자가 그 화면일 때만 허용한다).
//
// choiceResultAt · optionAccessibilityLabel · hasAnswered는 단어 선택(word-choice.ts)에도
// 있다. 거기서 import하지 않고 각자 자기 모듈에 구현한다(계약 §3.3 「이름이 다른 모듈과
// 겹치는 것은 의도다」) — word-choice.ts가 listening.ts에 대해 같은 판단을 이미 적어
// 뒀다.

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입 (계약 §3.2)
// 옵셔널 필드가 0개다(이음매 ② · ADR-0007 D5).

export type CultureQuizQuestion = {
  /** 문항 제시문. 요소로 쪼개지 않는다. */
  readonly prompt: string;
  /** 보기. 개수를 타입이 말하지 않는다(계약 D5(b)) — 컨텐츠가 정할 일이다. */
  readonly choices: readonly string[];
  /** 정답 보기의 인덱스. 범위 불변식은 tsc가 아니라 컨텐츠가 온 뒤의 unit이 진다(D5). */
  readonly answerIndex: number;
};

/**
 * 세션 상태. 응답 이력을 담지 않는다 — 판정이 화면 밖으로 나가지 않으므로
 * (계약 D1) 이력을 모을 소비자가 없다. 죽은 필드를 만들지 않는다.
 */
export type CultureQuizSessionState = {
  readonly questionIndex: number;
  readonly selectedChoiceIndex: number | null;
};

export type CultureQuizSessionAction =
  | { readonly type: "selectChoice"; readonly choiceIndex: number }
  | { readonly type: "nextQuestion" };

// ---------------------------------------------------------------- 문항 데이터의 자리 (계약 §3.4)
//
// 이음매 ④(교체 지점 주석) — 아래 넷을 이 표가 진다. 좌표가 아니라 의미로 가리킨다.
//
// **(a) 무엇이 임시인가** — 오른쪽 다섯 값이 빈 것이 임시다. 왼쪽 키(JourneyStepId
// 다섯)와 오른쪽 타입(CultureQuizQuestion)은 임시가 아니다.
//
// **(b) 무엇이 막고 있나** — 문항 컨텐츠는 페르소나 기획에서 오고, `docs/adr/README.md`
// 보류 표의 문화 컨텐츠 출처 행에 딸린다(culture.ts의 서사와 같은 시점·같은 축).
//
// **(c) 값이 오는 날 무엇만 바뀌나** — 이 표의 오른쪽 다섯 값뿐이다. 형태도 export
// 목록도 화면도 `ui` 테스트도 안 바뀐다.
//
// **(d) 이 표가 배정 근거가 아니다** — 다섯 키가 다 있는 것은 `Record`가 요구해서이지
// 다섯 스텝이 전부 문화라는 뜻이 아니다. 그리고 문화 퀴즈는 스텝에 배정되지 않는다
// (계약 D6) — 들어오는 전이는 문화 학습의 액션 행 하나다.
//
// 표는 export하지 않는다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓는다.
const cultureQuizQuestionsByStep: Record<JourneyStepId, readonly CultureQuizQuestion[]> = {
  greeting: [],
  introduction: [],
  ordering: [],
  appointment: [],
  directions: [],
};

// ---------------------------------------------------------------- 순수 함수 (계약 §3.3)
// 전부 부수효과가 없고 하나도 던지지 않는다.

export const initialCultureQuizSessionState: CultureQuizSessionState = {
  questionIndex: 0,
  selectedChoiceIndex: null,
};

// 계약 §3.3 표: `${ordinal}단계 · 문화 퀴즈` — 구분자는 가운뎃점 양옆 공백(화면 다섯과 같다).
export function cultureQuizScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 문화 퀴즈`;
}

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는 총함수다.
// 표(위)가 오늘 다섯 키 모두 빈 배열이라 이 몸통은 이미 최종형이다 — 문항 값이
// 오는 날에도 이 함수 자체는 안 바뀐다(표의 오른쪽 값만 바뀐다).
export function cultureQuizQuestionsForStep(id: JourneyStepId): readonly CultureQuizQuestion[] {
  return cultureQuizQuestionsByStep[id];
}

// 계약 §3.3 표: `문항 ${index + 1} / ${total}` — index는 0-based가 1-based 문구가 된다.
export function cultureQuizProgressLabel(index: number, total: number): string {
  return `문항 ${index + 1} / ${total}`;
}

// 계약 §3.3 표: answerIndex === choiceIndex 비교. answerIndex가 0인 문항에서도 0번
// 보기가 correct다 — 일치 비교라 0을 falsy로 다루는 자리가 생기지 않는다(U4).
export function judgeCultureQuiz(question: CultureQuizQuestion, choiceIndex: number): AnswerResult {
  return choiceIndex === question.answerIndex ? "correct" : "incorrect";
}

// 판정을 지는 보기는 고른 하나뿐이다 — 고르지 않은 보기는 정답이어도 null이다.
// 미응답(selectedChoiceIndex === null)은 어떤 choiceIndex와도 같지 않으므로 아래
// 한 줄에 함께 걸린다. 0번 보기를 골랐을 때도 0 === 0이라 판정이 나온다.
export function choiceResultAt(
  state: CultureQuizSessionState,
  question: CultureQuizQuestion,
  choiceIndex: number,
): AnswerResult | null {
  if (state.selectedChoiceIndex !== choiceIndex) {
    return null;
  }
  return judgeCultureQuiz(question, choiceIndex);
}

// 접미사는 lib/answer-result.ts의 answerResultLabel이 낸다 — 새 판정 낱말을 이 모듈에
// 짓지 않는다. 구분자는 쉼표 + 공백(ADR-0016 D3). 판정이 없으면 접미사를 붙이지 않는다.
export function optionAccessibilityLabel(text: string, result: AnswerResult | null): string {
  if (result === null) {
    return text;
  }
  return `${text}, ${answerResultLabel(result)}`;
}

// 응답 여부는 파생이다. null 비교라 0번 보기를 골라도 응답으로 센다(U7).
export function hasAnswered(state: CultureQuizSessionState): boolean {
  return state.selectedChoiceIndex !== null;
}

// 완료도 파생이다 — 상태에 별도 done 필드를 두지 않는다.
export function isCultureQuizSessionComplete(
  state: CultureQuizSessionState,
  total: number,
): boolean {
  return state.questionIndex >= total;
}

// 전이 넷이 정본이다(§3.3) — ① selectChoice + 미응답 → selectedChoiceIndex 갱신
// ② selectChoice + 이미 응답 → 같은 참조(막는 자리가 여기 하나다 — 컴포넌트에 둘째
// 게이트를 두지 않는다) ③ nextQuestion + 미응답 → 같은 참조 ④ nextQuestion + 응답 →
// questionIndex + 1, selectedChoiceIndex: null.
export function cultureQuizSessionReducer(
  state: CultureQuizSessionState,
  action: CultureQuizSessionAction,
): CultureQuizSessionState {
  switch (action.type) {
    case "selectChoice": {
      if (hasAnswered(state)) {
        return state;
      }
      return {
        questionIndex: state.questionIndex,
        selectedChoiceIndex: action.choiceIndex,
      };
    }
    case "nextQuestion": {
      if (state.selectedChoiceIndex === null) {
        return state;
      }
      return {
        questionIndex: state.questionIndex + 1,
        selectedChoiceIndex: null,
      };
    }
  }
}

// ---------------------------------------------------------------- 완료 전이 발화 (LIB-247 계약 §3)
// 계약: .agent-harness/work/lib-247/spec.md §3.1(export 목록) · §3.2(시그니처와 값).
//
// 둘째 상수의 이름이 넷 중 이 화면만 다른 것이 의도다(계약 §3.1) — 이 화면의 그 낱말은
// **나가는 수단**(`culture-quiz-screen-exit`)이고 나머지 셋은 **나아가는 수단**이다.
// 시그니처는 넷이 같다.

/** 종료 상태 문구. 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 자리**에서 나온다 (ADR-0016 D11-1). */
export const cultureQuizCompletionText = "문항을 모두 마쳤어요";

/** 완료 상태에서 화면에 남는 **유일한 조작 단위**의 라벨. 이 화면에서는 `맵으로`다. */
export const cultureQuizExitLabel = "맵으로";

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
export function cultureQuizCompletionAnnouncement(nextActionLabel: string): string {
  // 인자를 계약이 고정한 이름 그대로 둔 채 무동작을 유지한다 — `logic` 단계가 이 줄을
  // 지우고 `${cultureQuizCompletionText}, ${nextActionLabel}`을 돌려준다.
  void nextActionLabel;
  return "";
}
