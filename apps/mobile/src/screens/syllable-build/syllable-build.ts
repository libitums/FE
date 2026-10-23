// 음절 조립 활동의 순수 로직입니다. UI를 import하지 않습니다.
//
// 판정은 타일 인덱스가 아니라 놓인 글자를 이은 낱말 문자열입니다 — 같은 음절이 두 장인 문항에서도 어느
// 장을 먼저 놓든 정답입니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  SyllableBuildCopy,
  SyllableBuildPhase,
  SyllableBuildQuestion,
  SyllableBuildSessionAction,
  SyllableBuildSessionState,
  SyllableBuildWordAccessibility,
} from "./syllable-build.contract";

export const initialSyllableBuildSessionState: SyllableBuildSessionState = {
  questionIndex: 0,
  placedTileIndexes: [],
  phase: "building",
  submittedTileIndexes: [],
};

/**
 * 전이 네 줄의 정본입니다. 변화가 없으면 같은 참조를 돌려줍니다. 막는 자리는 여기 하나입니다 — 채점 뒤에는
 * 타일이 움직이지 않고, 칸이 차면 새 타일을 흡수합니다.
 */
export function syllableBuildSessionReducer(
  state: SyllableBuildSessionState,
  action: SyllableBuildSessionAction,
): SyllableBuildSessionState {
  switch (action.type) {
    case "toggleTile": {
      if (state.phase === "checked") return state;
      if (state.placedTileIndexes.includes(action.tileIndex)) {
        return {
          ...state,
          placedTileIndexes: state.placedTileIndexes.filter((index) => index !== action.tileIndex),
        };
      }
      if (state.placedTileIndexes.length >= action.slotCount) return state;
      return { ...state, placedTileIndexes: [...state.placedTileIndexes, action.tileIndex] };
    }
    case "check": {
      if (state.phase === "checked") return state;
      return {
        ...state,
        phase: "checked",
        submittedTileIndexes: [...state.submittedTileIndexes, state.placedTileIndexes],
      };
    }
    case "nextQuestion": {
      if (state.phase === "building") return state;
      return {
        questionIndex: state.questionIndex + 1,
        placedTileIndexes: [],
        phase: "building",
        submittedTileIndexes: state.submittedTileIndexes,
      };
    }
  }
}

/** 놓인 타일 글자를 순서대로 `""`로 잇습니다. 범위 밖 인덱스는 빈 글자입니다. */
export function composedWord(
  question: SyllableBuildQuestion,
  placedTileIndexes: readonly number[],
): string {
  return placedTileIndexes.map((index) => question.tiles[index] ?? "").join("");
}

export function judgeSyllableBuild(
  question: SyllableBuildQuestion,
  placedTileIndexes: readonly number[],
): AnswerResult {
  const word = composedWord(question, placedTileIndexes);
  return question.answers.includes(word) ? "correct" : "incorrect";
}

export function canCheckSyllableBuild(
  question: SyllableBuildQuestion,
  state: SyllableBuildSessionState,
): boolean {
  return state.phase === "building" && state.placedTileIndexes.length === question.slotCount;
}

export function canPlaceSyllableTile(
  question: SyllableBuildQuestion,
  state: SyllableBuildSessionState,
): boolean {
  return state.phase === "building" && state.placedTileIndexes.length < question.slotCount;
}

/** 채점 뒤에만 판정이 있고 그 전에는 `null`입니다. */
export function syllableBuildResultAt(
  question: SyllableBuildQuestion,
  state: SyllableBuildSessionState,
): AnswerResult | null {
  return state.phase === "checked" ? judgeSyllableBuild(question, state.placedTileIndexes) : null;
}

export function isSyllableBuildSessionComplete(
  state: SyllableBuildSessionState,
  total: number,
): boolean {
  return state.questionIndex >= total;
}

/** 제출 이력을 문항별로 판정합니다. 짧은 쪽 길이까지만 냅니다. */
export function syllableBuildSessionResults(
  questions: readonly SyllableBuildQuestion[],
  submittedTileIndexes: readonly (readonly number[])[],
): readonly AnswerResult[] {
  const length = Math.min(questions.length, submittedTileIndexes.length);
  const results: AnswerResult[] = [];
  for (let index = 0; index < length; index += 1) {
    const question = questions[index];
    const placed = submittedTileIndexes[index];
    if (question === undefined || placed === undefined) break;
    results.push(judgeSyllableBuild(question, placed));
  }
  return results;
}

/** 창고 타일은 글자 그대로(한국어 음성이 읽습니다), 놓인 타일은 칸 번호와 전체 칸 수가 붙습니다. */
export function syllableTileAccessibilityLabel(
  text: string,
  placedOrdinal: number | null,
  slotCount: number,
  copy: SyllableBuildCopy,
): string {
  return placedOrdinal === null ? text : copy.placedTile(text, placedOrdinal, slotCount);
}

/** 비었으면 줄 하나가 요소, 놓이는 중이면 타일이 각자 요소, 채점 뒤에는 만든 낱말을 읽는 줄 하나입니다. */
export function syllableBuildWordAccessibilityOf(
  question: SyllableBuildQuestion,
  state: SyllableBuildSessionState,
  copy: SyllableBuildCopy,
): SyllableBuildWordAccessibility {
  if (state.placedTileIndexes.length === 0)
    return { kind: "row", label: copy.wordEmpty(question.slotCount) };
  if (state.phase === "building") return { kind: "tiles" };
  return { kind: "row", label: copy.word(composedWord(question, state.placedTileIndexes)) };
}

export function syllableBuildCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}

/** 답 칸의 상태: 놓임(`filled`) · 다음에 채울 칸(`current`) · 빈 칸(`empty`). */
export type SyllableSlotState = "filled" | "current" | "empty";

export function syllableSlotStateOf(
  position: number,
  placedCount: number,
  phase: SyllableBuildPhase,
): SyllableSlotState {
  if (position < placedCount) return "filled";
  return phase === "building" && position === placedCount ? "current" : "empty";
}
