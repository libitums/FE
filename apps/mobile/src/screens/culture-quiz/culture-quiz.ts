// 문화 퀴즈 화면의 순수 로직 + 고정 데이터 자리 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// 계약: .agent-harness/work/lib-244/spec.md §3(타입·모듈 계약).
//
// ⚠ LIB-244 (logic-scaffold) — 이 파일은 껍데기다. 계약 §3이 고정한 타입·export
// 이름·시그니처로 이 모듈을 import 가능하게 세우고, 함수 몸통은 아직 무동작이다.
// 실제 채점·판정 계산은 이 뒤의 logic 단계가 채운다 — 지금 채우면 그 단계의 red가
// 서지 않는다(계약 §8.1 「red가 비-공허한 이유」). `TODO(logic)` 주석이 각 함수가
// 실제로 계산할 식을 적어 둔다.
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

import type { AnswerResult } from "../../lib/answer-result";
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
//
// ⚠ logic-scaffold — 아래 몸통은 타입이 요구하는 가장 무의미한 값을 돌려줄 뿐이다
// (호출은 되지만 정답은 내지 않는다). `TODO(logic)` 줄이 실제 계산식을 적어 둔다.

export const initialCultureQuizSessionState: CultureQuizSessionState = {
  questionIndex: 0,
  selectedChoiceIndex: null,
};

// TODO(logic): `${ordinal}단계 · 문화 퀴즈` — 구분자는 가운뎃점 양옆 공백(화면 다섯과 같다).
export function cultureQuizScreenTitle(_ordinal: number): string {
  return "";
}

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는 총함수다.
// 표(위)가 오늘 다섯 키 모두 빈 배열이라 이 몸통은 이미 최종형이다 — 문항 값이
// 오는 날에도 이 함수 자체는 안 바뀐다(표의 오른쪽 값만 바뀐다).
export function cultureQuizQuestionsForStep(id: JourneyStepId): readonly CultureQuizQuestion[] {
  return cultureQuizQuestionsByStep[id];
}

// TODO(logic): `문항 ${index + 1} / ${total}` — index는 0-based가 1-based 문구가 된다.
export function cultureQuizProgressLabel(_index: number, _total: number): string {
  return "";
}

// TODO(logic): answerIndex === choiceIndex 비교. 일치면 "correct". answerIndex가 0인
// 문항에서도 0번 보기가 correct다 — 0을 falsy로 다루는 자리를 만들지 않는다(U4).
export function judgeCultureQuiz(
  _question: CultureQuizQuestion,
  _choiceIndex: number,
): AnswerResult {
  return "incorrect";
}

// TODO(logic): 고른 하나만 판정을 진다. 고르지 않은 정답 보기는 null이다. 미응답
// 상태에서는 모든 보기가 null이다.
export function choiceResultAt(
  _state: CultureQuizSessionState,
  _question: CultureQuizQuestion,
  _choiceIndex: number,
): AnswerResult | null {
  return null;
}

// TODO(logic): null이면 text 그대로. 아니면 `${text}, ${answerResultLabel(result)}` —
// 구분자는 쉼표 + 공백(ADR-0016 D3).
export function optionAccessibilityLabel(text: string, _result: AnswerResult | null): string {
  return text;
}

// TODO(logic): selectedChoiceIndex !== null. `0`을 falsy로 다루는 자리를 만들지
// 않는다(U7).
export function hasAnswered(_state: CultureQuizSessionState): boolean {
  return false;
}

// TODO(logic): questionIndex >= total.
export function isCultureQuizSessionComplete(
  _state: CultureQuizSessionState,
  _total: number,
): boolean {
  return false;
}

// TODO(logic): 전이 넷이 정본이다 — ① selectChoice + 미응답 → selectedChoiceIndex
// 갱신 ② selectChoice + 이미 응답 → 같은 참조(막는 자리가 여기 하나다) ③ nextQuestion
// + 미응답 → 같은 참조 ④ nextQuestion + 응답 → questionIndex + 1,
// selectedChoiceIndex: null. 변화 없으면 같은 참조를 돌려준다(U9).
export function cultureQuizSessionReducer(
  state: CultureQuizSessionState,
  _action: CultureQuizSessionAction,
): CultureQuizSessionState {
  return state;
}
