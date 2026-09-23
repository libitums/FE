// 문장 순서 화면의 순수 로직과 고정 데이터를 소유합니다(ADR-0006 D4 — 순수
// 로직은 unit 계층 대상입니다). UI를 import하지 않습니다 — 화면 폴더에 있지만
// 화면 컴포넌트를 참조하지 않는 순수 모듈입니다(listening.ts · assessment.ts와
// 같은 판단입니다).

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입

export type SentenceOrderQuestion = {
  /** 무엇을 만드는 문항인지 알리는 제시문입니다. 빈칸 표기 규약을 두지 않습니다. */
  readonly prompt: string;
  /** 화면에 제시되는 조각입니다. 이 배열의 순서가 곧 창고의 제시 순서이고 정답 순서가 아닙니다. */
  readonly chips: readonly string[];
  /** 정답 = chips의 인덱스를 정답 순서대로 나열한 것입니다. 문자열이 아니라 인덱스입니다. */
  readonly answerOrder: readonly number[];
};

export type SentenceOrderPhase = "arranging" | "checked";

// 판정 결과를 세션 상태에 적지 않습니다 — submittedOrders가 지는 것은 제출한
// 배치이고 정오는 문항 데이터에서 파생합니다(듣기의 answeredChoiceIndexes와
// 같은 규율입니다).
export type SentenceOrderSessionState = {
  readonly questionIndex: number;
  /** 배치된 조각의 chips 인덱스입니다 — 배열 순서가 곧 문장 순서입니다. */
  readonly placedChipIndexes: readonly number[];
  readonly phase: SentenceOrderPhase;
  /** 지나간 문항의 제출 이력입니다. 평가로 넘길 결과의 재료입니다. */
  readonly submittedOrders: readonly (readonly number[])[];
};

export type SentenceOrderSessionAction =
  | { readonly type: "toggleChip"; readonly chipIndex: number }
  | { readonly type: "check" }
  | { readonly type: "nextQuestion" };

export const initialSentenceOrderSessionState: SentenceOrderSessionState = {
  questionIndex: 0,
  placedChipIndexes: [],
  phase: "arranging",
  submittedOrders: [],
};

// 문항 데이터의 자리입니다. 어느 스텝이 어느 학습형인지가 저장소 데이터
// 어디에도 없고, 문항 텍스트·조각·정답 순서의 값도 컨텐츠 공급 경로가
// 정해지지 않았습니다. 다섯 키를 전부 두고 값은 빈 배열로 둡니다 — 지어내지
// 않습니다.
export const sentenceOrderQuestionsByStep: Record<JourneyStepId, readonly SentenceOrderQuestion[]> =
  {
    greeting: [],
    introduction: [],
    ordering: [],
    appointment: [],
    directions: [],
  };

// ---------------------------------------------------------------- 순수 함수
// 열둘 전부 부수효과가 없습니다. 방어 분기를 두지 않습니다 — Record가 다섯
// 스텝을 전부 갖는 것은 tsc가 지고, 범위 밖 입력에도 아래 식이 그대로
// 적용됩니다.

// `${ordinal}단계 · 문장 순서` 형태입니다 — 구분자는 가운뎃점 양옆 공백
// (듣기·평가와 같습니다).
export function sentenceOrderScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 문장 순서`;
}

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는
// 총함수입니다.
export function sentenceOrderQuestionsForStep(id: JourneyStepId): readonly SentenceOrderQuestion[] {
  return sentenceOrderQuestionsByStep[id];
}

// `문항 ${index + 1} / ${total}` 형태입니다 — index는 0-based입니다(듣기와
// 같은 문자열 형태).
export function sentenceOrderProgressLabel(index: number, total: number): string {
  return `문항 ${index + 1} / ${total}`;
}

// 정답 순서와 배치가 길이·각 원소 전부 같으면 correct, 아니면 incorrect
// 입니다. 인덱스로 비교하므로 같은 낱말이 두 번 나오는 문항에서도 어느
// 조각인지 갈립니다. 짧아도 던지지 않고 incorrect입니다.
export function judgeSentenceOrder(
  question: SentenceOrderQuestion,
  placedChipIndexes: readonly number[],
): AnswerResult {
  const { answerOrder } = question;
  if (placedChipIndexes.length !== answerOrder.length) {
    return "incorrect";
  }
  for (let index = 0; index < answerOrder.length; index += 1) {
    if (placedChipIndexes[index] !== answerOrder[index]) {
      return "incorrect";
    }
  }
  return "correct";
}

// 「확인」이 뜨는가 — phase가 arranging이고 배치 수가 chips.length와 같을
// 때만 true입니다. checked면 전부 배치돼 있어도 false입니다 — check가 배치
// 완료를 다시 검사하지 않도록 화면이 이 식 하나만 씁니다.
export function canCheckArrangement(
  question: SentenceOrderQuestion,
  state: SentenceOrderSessionState,
): boolean {
  return state.phase === "arranging" && state.placedChipIndexes.length === question.chips.length;
}

// 창고에 남은 조각입니다 — placedChipIndexes에 없는 chips 인덱스를 chips
// 순서대로 냅니다.
export function bankChipIndexes(
  question: SentenceOrderQuestion,
  state: SentenceOrderSessionState,
): readonly number[] {
  const placed = new Set(state.placedChipIndexes);
  const result: number[] = [];
  for (let index = 0; index < question.chips.length; index += 1) {
    if (!placed.has(index)) {
      result.push(index);
    }
  }
  return result;
}

// 조각의 낭독 이름입니다 — placedOrdinal이 null이면 이름만, 아니면
// `${text}, ${n}번째`입니다.
export function chipAccessibilityLabel(text: string, placedOrdinal: number | null): string {
  if (placedOrdinal === null) {
    return text;
  }
  return `${text}, ${placedOrdinal}번째`;
}

// 지금 보여 줄 판정입니다 — checked일 때만 judgeSentenceOrder를 부르고, 그
// 전에는 null입니다.
export function sentenceOrderResultAt(
  question: SentenceOrderQuestion,
  state: SentenceOrderSessionState,
): AnswerResult | null {
  if (state.phase !== "checked") {
    return null;
  }
  return judgeSentenceOrder(question, state.placedChipIndexes);
}

// 완료도 파생입니다 — 상태에 done을 적지 않습니다(듣기의 isSessionComplete와
// 같은 규율입니다).
export function isSentenceOrderSessionComplete(
  state: SentenceOrderSessionState,
  total: number,
): boolean {
  return state.questionIndex >= total;
}

// 전이표 일곱 줄이 이 함수의 정본입니다. 변화 없으면 같은 참조를 돌려줍니다
// — navReducer · stepSheetReducer · listeningSessionReducer와 같은 규약입니다.
//
// 막는 자리가 하나입니다 — phase === "checked"에서 toggleChip · check는 둘
// 다 같은 참조로 흡수합니다. check가 배치 완료를 검사하지 않습니다 —
// canCheckArrangement가 그 판정을 지고, 덜 배치된 채로 check가 들어와도
// judgeSentenceOrder가 조용히 incorrect를 돌려주므로 조용한 실패가 없습니다.
//
// submittedOrders가 느는 자리는 check 한 줄입니다 — nextQuestion에서 함께
// 넣으면 같은 제출이 두 곳에 삽니다(듣기가 같은 판단을 했습니다).
export function sentenceOrderSessionReducer(
  state: SentenceOrderSessionState,
  action: SentenceOrderSessionAction,
): SentenceOrderSessionState {
  switch (action.type) {
    case "toggleChip": {
      if (state.phase === "checked") {
        return state;
      }
      const { chipIndex } = action;
      const alreadyPlaced = state.placedChipIndexes.includes(chipIndex);
      if (alreadyPlaced) {
        return {
          questionIndex: state.questionIndex,
          placedChipIndexes: state.placedChipIndexes.filter((index) => index !== chipIndex),
          phase: state.phase,
          submittedOrders: state.submittedOrders,
        };
      }
      return {
        questionIndex: state.questionIndex,
        placedChipIndexes: [...state.placedChipIndexes, chipIndex],
        phase: state.phase,
        submittedOrders: state.submittedOrders,
      };
    }
    case "check": {
      if (state.phase === "checked") {
        return state;
      }
      return {
        questionIndex: state.questionIndex,
        placedChipIndexes: state.placedChipIndexes,
        phase: "checked",
        submittedOrders: [...state.submittedOrders, state.placedChipIndexes],
      };
    }
    case "nextQuestion": {
      if (state.phase === "arranging") {
        return state;
      }
      return {
        questionIndex: state.questionIndex + 1,
        placedChipIndexes: [],
        phase: "arranging",
        submittedOrders: state.submittedOrders,
      };
    }
  }
}

// ---------------------------------------------------------------- 이력 → 판정
// 이력의 각 제출을 그 자리 문항으로 판정합니다. judgeSentenceOrder를 다시
// 쓰지 않고 부릅니다 — 판정의 정본은 여전히 하나입니다. 이력이 문항 수보다 짧으면
// 짧은 쪽 길이로 끝납니다(던지지 않습니다).
export function sentenceOrderSessionResults(
  questions: readonly SentenceOrderQuestion[],
  submittedOrders: readonly (readonly number[])[],
): readonly AnswerResult[] {
  const length = Math.min(questions.length, submittedOrders.length);
  const results: AnswerResult[] = [];
  for (let index = 0; index < length; index += 1) {
    const question = questions[index];
    const submittedOrder = submittedOrders[index];
    if (question === undefined || submittedOrder === undefined) {
      break;
    }
    results.push(judgeSentenceOrder(question, submittedOrder));
  }
  return results;
}

// 능동 낭독 문자열입니다 — answerResultLabel을 다시 감싸지 않고 그 낱말을
// 그대로 씁니다.
export function sentenceOrderAnnouncement(result: AnswerResult): string {
  return `채점 결과, ${answerResultLabel(result)}`;
}

// ---------------------------------------------------------------- 완료 전이 발화
//
// 위의 `sentenceOrderAnnouncement`(채점)는 **이름도 몸통도 안 바뀝니다** —
// 아래 새 이름이 두 채널을 이름으로 가릅니다.

/** 종료 상태 문구입니다. 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 자리**에서 납니다(ADR-0016 D11-1). */
export const sentenceOrderCompletionText = "문항을 모두 마쳤어요";

/** 완료 상태에서 화면에 남는 **유일한 조작 단위**의 라벨입니다. 이 화면에서는 `결과 보기`입니다. */
export const sentenceOrderFinishLabel = "결과 보기";

/**
 * 완료 전이의 발화 문자열입니다. 구분자는 쉼표+공백 — D3이 고른 부호를 그대로
 * 씁니다(`평가 결과, 통과` · `채점 결과, 정답`과 같은 형태).
 *
 * 인자는 **완료 상태에서 유일한 조작 단위의 라벨**입니다. 발화는 떠다니므로
 * *무엇이* 끝났는지(앞절)와 *이제 무엇이 남았는지*(뒷절)가 소리 안에 있어야
 * 합니다.
 *
 * 앞절은 리터럴을 다시 적지 않고 `sentenceOrderCompletionText`를 지납니다 —
 * 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 표를 지납니다.**
 */
export function sentenceOrderCompletionAnnouncement(nextActionLabel: string): string {
  return `${sentenceOrderCompletionText}, ${nextActionLabel}`;
}
