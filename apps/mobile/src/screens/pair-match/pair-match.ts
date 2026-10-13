// 짝 맞추기 활동의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  PairLink,
  PairMatchQuestion,
  PairMatchSessionAction,
  PairMatchSessionState,
  PairSide,
  PairTileMark,
} from "./pair-match.contract";

export const initialPairMatchSessionState: PairMatchSessionState = {
  questionIndex: 0,
  selectedWord: null,
  selectedMeaning: null,
  links: [],
  phase: "matching",
  submitted: [],
};

export function pairMatchSessionReducer(
  state: PairMatchSessionState,
  _action: PairMatchSessionAction,
): PairMatchSessionState {
  return state;
}

export function pairLinkOf(
  _links: readonly PairLink[],
  _side: PairSide,
  _index: number,
): PairLink | null {
  return null;
}

export function pairTileMarkOf(
  _state: PairMatchSessionState,
  _side: PairSide,
  _index: number,
): PairTileMark {
  return "idle";
}

export function canCheckPairs(
  _question: PairMatchQuestion,
  _state: PairMatchSessionState,
): boolean {
  return false;
}

export function judgePairLink(_question: PairMatchQuestion, _link: PairLink): AnswerResult {
  return "incorrect";
}

export function judgePairMatch(
  _question: PairMatchQuestion,
  _links: readonly PairLink[],
): AnswerResult {
  return "incorrect";
}

export function pairMatchResultAt(
  _question: PairMatchQuestion,
  _state: PairMatchSessionState,
): AnswerResult | null {
  return null;
}

export function pairTileResultAt(
  _question: PairMatchQuestion,
  _state: PairMatchSessionState,
  _side: PairSide,
  _index: number,
): AnswerResult | null {
  return null;
}

export function pairMatchMissedPairs(
  _question: PairMatchQuestion,
  _links: readonly PairLink[],
): readonly { readonly word: string; readonly meaning: string }[] {
  return [];
}

export function pairMatchRevealText(
  _question: PairMatchQuestion,
  _links: readonly PairLink[],
  _copy: UiCopy,
): string | null {
  return null;
}

export function isPairMatchSessionComplete(_state: PairMatchSessionState, _total: number): boolean {
  return false;
}

export function pairMatchSessionResults(
  _questions: readonly PairMatchQuestion[],
  _submitted: readonly (readonly PairLink[])[],
): readonly AnswerResult[] {
  return [];
}

export function pairTileAccessibilityLabel(
  _text: string,
  _mark: PairTileMark,
  _partnerText: string | null,
  _pairOrdinal: number | null,
  _result: AnswerResult | null,
  _copy: UiCopy,
): string {
  return "";
}

export function pairMatchTransitionAnnouncement(
  _question: PairMatchQuestion,
  _previous: PairMatchSessionState,
  _current: PairMatchSessionState,
  _copy: UiCopy,
): string | null {
  return null;
}

export function pairMatchCompletionAnnouncement(_nextActionLabel: string, _copy: UiCopy): string {
  return "";
}
