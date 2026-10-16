// 음절 조립 활동의 순수 로직입니다. UI를 import하지 않습니다.
//
// 뼈대만 선 상태입니다 — 전이 · 판정 · 파생 · 낭독 문구는 아직 채우지 않았습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  SyllableBuildCopy,
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

export function syllableBuildSessionReducer(
  state: SyllableBuildSessionState,
  _action: SyllableBuildSessionAction,
): SyllableBuildSessionState {
  return state;
}

export function composedWord(
  _question: SyllableBuildQuestion,
  _placedTileIndexes: readonly number[],
): string {
  return "";
}

export function judgeSyllableBuild(
  _question: SyllableBuildQuestion,
  _placedTileIndexes: readonly number[],
): AnswerResult {
  return "incorrect";
}

export function canCheckSyllableBuild(
  _question: SyllableBuildQuestion,
  _state: SyllableBuildSessionState,
): boolean {
  return false;
}

export function canPlaceSyllableTile(
  _question: SyllableBuildQuestion,
  _state: SyllableBuildSessionState,
): boolean {
  return false;
}

export function syllableBuildResultAt(
  _question: SyllableBuildQuestion,
  _state: SyllableBuildSessionState,
): AnswerResult | null {
  return null;
}

export function isSyllableBuildSessionComplete(
  _state: SyllableBuildSessionState,
  _total: number,
): boolean {
  return false;
}

export function syllableBuildSessionResults(
  _questions: readonly SyllableBuildQuestion[],
  _submittedTileIndexes: readonly (readonly number[])[],
): readonly AnswerResult[] {
  return [];
}

export function syllableTileAccessibilityLabel(
  _text: string,
  _placedOrdinal: number | null,
  _copy: SyllableBuildCopy,
): string {
  return "";
}

export function syllableBuildWordAccessibilityOf(
  _question: SyllableBuildQuestion,
  _state: SyllableBuildSessionState,
  _copy: SyllableBuildCopy,
): SyllableBuildWordAccessibility {
  return { kind: "row", label: "" };
}

export function syllableBuildCompletionAnnouncement(
  _nextActionLabel: string,
  _copy: UiCopy,
): string {
  return "";
}
