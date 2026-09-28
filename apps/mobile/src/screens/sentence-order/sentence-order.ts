// 문장 순서 화면의 순수 로직과 고정 데이터를 소유합니다(ADR-0006 D4 — 순수
// 로직은 unit 계층 대상입니다). UI를 import하지 않습니다 — 화면 폴더에 있지만
// 화면 컴포넌트를 참조하지 않는 순수 모듈입니다(listening.ts · assessment.ts와
// 같은 판단입니다).

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입

export type SentenceOrderQuestion = {
  /**
   * 상대의 말입니다 — 대화 카드의 왼쪽 말풍선에 섭니다. 학습자는 그 말에 답하는 문장을
   * 만듭니다(Figma 65-14 「Complete the conversation」). 빈칸 표기 규약을 두지 않습니다.
   */
  readonly prompt: string;
  /**
   * 화면에 제시되는 조각입니다. 이 배열의 순서가 곧 창고의 제시 순서이고 정답 순서가
   * 아닙니다. ⟨2026-09-28⟩ **정답에 쓰이지 않는 조각(오답 낱말)이 섞일 수 있습니다** —
   * 정답에 없는 인덱스가 그것입니다.
   */
  readonly chips: readonly string[];
  /**
   * 정답 = chips의 인덱스를 정답 순서대로 나열한 것입니다. 문자열이 아니라 인덱스입니다.
   * chips의 부분집합이고, 이 길이가 곧 「놓을 칸 수」입니다.
   */
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

// 문항 데이터의 자리입니다. 문항 텍스트·조각·정답 순서의 값은 컨텐츠 공급 경로가
// 정해지지 않았습니다. 다섯 키를 전부 두고, 문장 만들기가 배정된 스텝(첫 인사)에만
// **임시 문항**을 둡니다 — 디자인(Figma 65-14)의 예시 대화를 따라 지은 값이고, 오답
// 낱말이 섞여 있습니다. 컨텐츠가 오면 이 표만 갈립니다.
export const sentenceOrderQuestionsByStep: Record<JourneyStepId, readonly SentenceOrderQuestion[]> =
  {
    greeting: [
      {
        prompt: "안녕 만나서 반가워",
        chips: ["반가워", "안녕", "배고파", "나도", "피곤해"],
        answerOrder: [1, 3, 0],
      },
      {
        prompt: "이름이 뭐예요?",
        chips: ["민수예요", "내일", "이름은", "제", "좋아요"],
        answerOrder: [3, 2, 0],
      },
      {
        prompt: "커피 마실래요?",
        chips: ["좋아요", "아니요", "네", "학교"],
        answerOrder: [2, 0],
      },
    ],
    introduction: [],
    ordering: [],
    appointment: [],
    directions: [],
  };

// ---------------------------------------------------------------- 순수 함수
// 열둘 전부 부수효과가 없습니다. 방어 분기를 두지 않습니다 — Record가 다섯
// 스텝을 전부 갖는 것은 tsc가 지고, 범위 밖 입력에도 아래 식이 그대로
// 적용됩니다.

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는
// 총함수입니다.
export function sentenceOrderQuestionsForStep(id: JourneyStepId): readonly SentenceOrderQuestion[] {
  return sentenceOrderQuestionsByStep[id];
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
/**
 * 채점할 수 있는가입니다. **정답 길이만큼** 놓았을 때 참입니다 — 오답 낱말이 섞이므로
 * 창고를 다 비울 필요가 없습니다(⟨2026-09-28⟩ 전에는 조각을 전부 놓아야 했습니다).
 */
export function canCheckArrangement(
  question: SentenceOrderQuestion,
  state: SentenceOrderSessionState,
): boolean {
  return (
    state.phase === "arranging" && state.placedChipIndexes.length === question.answerOrder.length
  );
}

/**
 * 창고의 조각을 더 놓을 수 있는가입니다. 칸(정답 길이)이 다 차면 거짓입니다 — 그 뒤로는
 * 놓인 조각을 빼야 다른 조각을 놓을 수 있습니다.
 */
export function canPlaceChip(
  question: SentenceOrderQuestion,
  state: SentenceOrderSessionState,
): boolean {
  return (
    state.phase === "arranging" && state.placedChipIndexes.length < question.answerOrder.length
  );
}

/** 놓인 조각을 순서대로 이은 문장입니다 — 채점 뒤 내 말풍선에 섭니다. */
export function composedSentence(
  question: SentenceOrderQuestion,
  placedChipIndexes: readonly number[],
): string {
  return placedChipIndexes.map((index) => question.chips[index]).join(" ");
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
