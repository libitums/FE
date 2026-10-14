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
  action: PairMatchSessionAction,
): PairMatchSessionState {
  switch (action.type) {
    case "tapTile":
      return state.phase === "checked" ? state : tappedTile(state, action.side, action.index);
    case "check":
      if (state.phase !== "matching" || state.links.length !== action.pairCount) return state;
      return {
        ...state,
        phase: "checked",
        selectedWord: null,
        selectedMeaning: null,
        submitted: [...state.submitted, state.links],
      };
    case "nextQuestion":
      if (state.phase !== "checked") return state;
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        selectedWord: null,
        selectedMeaning: null,
        links: [],
        phase: "matching",
      };
  }
}

/** 맺을 때 비어 있는 가장 작은 양의 정수입니다. */
function freeOrdinal(links: readonly PairLink[]): number {
  let ordinal = 1;
  while (links.some((entry) => entry.ordinal === ordinal)) ordinal += 1;
  return ordinal;
}

function withSelection(
  state: PairMatchSessionState,
  side: PairSide,
  index: number | null,
): PairMatchSessionState {
  return side === "word" ? { ...state, selectedWord: index } : { ...state, selectedMeaning: index };
}

function tappedTile(
  state: PairMatchSessionState,
  side: PairSide,
  index: number,
): PairMatchSessionState {
  if (!Number.isInteger(index) || index < 0) return state;
  const linked = pairLinkOf(state.links, side, index);
  if (linked !== null) return { ...state, links: state.links.filter((entry) => entry !== linked) };
  const own = side === "word" ? state.selectedWord : state.selectedMeaning;
  const other = side === "word" ? state.selectedMeaning : state.selectedWord;
  if (own === index) return withSelection(state, side, null);
  if (other === null) return withSelection(state, side, index);
  const word = side === "word" ? index : other;
  const meaning = side === "word" ? other : index;
  return {
    ...state,
    links: [...state.links, { word, meaning, ordinal: freeOrdinal(state.links) }],
    selectedWord: null,
    selectedMeaning: null,
  };
}

export function pairLinkOf(
  links: readonly PairLink[],
  side: PairSide,
  index: number,
): PairLink | null {
  return links.find((entry) => (side === "word" ? entry.word : entry.meaning) === index) ?? null;
}

export function pairTileMarkOf(
  state: PairMatchSessionState,
  side: PairSide,
  index: number,
): PairTileMark {
  if (pairLinkOf(state.links, side, index) !== null) return "linked";
  const selected = side === "word" ? state.selectedWord : state.selectedMeaning;
  return selected === index ? "selected" : "idle";
}

export function canCheckPairs(question: PairMatchQuestion, state: PairMatchSessionState): boolean {
  return state.phase === "matching" && state.links.length === question.words.length;
}

export function judgePairLink(question: PairMatchQuestion, link: PairLink): AnswerResult {
  const meaning = question.meanings[link.meaning];
  return meaning !== undefined && meaning === question.meanings[question.answer[link.word] ?? -1]
    ? "correct"
    : "incorrect";
}

export function judgePairMatch(
  question: PairMatchQuestion,
  links: readonly PairLink[],
): AnswerResult {
  return links.length === question.words.length &&
    links.every((entry) => judgePairLink(question, entry) === "correct")
    ? "correct"
    : "incorrect";
}

export function pairMatchResultAt(
  question: PairMatchQuestion,
  state: PairMatchSessionState,
): AnswerResult | null {
  return state.phase === "checked"
    ? judgePairMatch(question, state.submitted[state.questionIndex] ?? [])
    : null;
}

export function pairTileResultAt(
  question: PairMatchQuestion,
  state: PairMatchSessionState,
  side: PairSide,
  index: number,
): AnswerResult | null {
  if (state.phase !== "checked") return null;
  const linked = pairLinkOf(state.links, side, index);
  return linked === null ? null : judgePairLink(question, linked);
}

export function pairMatchMissedPairs(
  question: PairMatchQuestion,
  links: readonly PairLink[],
): readonly { readonly word: string; readonly meaning: string }[] {
  const missed: { readonly word: string; readonly meaning: string }[] = [];
  question.words.forEach((word, w) => {
    const linked = pairLinkOf(links, "word", w);
    if (linked !== null && judgePairLink(question, linked) === "correct") return;
    const meaning = question.meanings[question.answer[w] ?? -1];
    if (meaning !== undefined) missed.push({ word, meaning });
  });
  return missed;
}

export function pairMatchRevealText(
  question: PairMatchQuestion,
  links: readonly PairLink[],
  copy: UiCopy,
): string | null {
  const missed = pairMatchMissedPairs(question, links);
  if (missed.length === 0) return null;
  return missed.map((pair) => copy.pairMatch.answerPair(pair.word, pair.meaning)).join("\n");
}

export function isPairMatchSessionComplete(state: PairMatchSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

export function pairMatchSessionResults(
  questions: readonly PairMatchQuestion[],
  submitted: readonly (readonly PairLink[])[],
): readonly AnswerResult[] {
  const results: AnswerResult[] = [];
  for (let index = 0; index < Math.min(questions.length, submitted.length); index += 1) {
    const question = questions[index];
    const links = submitted[index];
    if (question !== undefined && links !== undefined) {
      results.push(judgePairMatch(question, links));
    }
  }
  return results;
}

export function pairTileAccessibilityLabel(
  text: string,
  mark: PairTileMark,
  partnerText: string | null,
  pairOrdinal: number | null,
  result: AnswerResult | null,
  copy: UiCopy,
): string {
  if (mark === "idle") return text;
  if (mark === "selected") return copy.pairMatch.selected(text);
  if (partnerText === null || pairOrdinal === null) return text;
  if (result === null) return copy.pairMatch.matched(text, pairOrdinal, partnerText);
  return `${copy.pairMatch.judged(text, partnerText)}, ${copy.common.answerResultSuffix[result]}`;
}

export function pairMatchTransitionAnnouncement(
  question: PairMatchQuestion,
  previous: PairMatchSessionState,
  current: PairMatchSessionState,
  copy: UiCopy,
): string | null {
  if (previous.questionIndex !== current.questionIndex) return null;
  if (previous.phase === "matching" && current.phase === "checked") {
    const result = judgePairMatch(question, current.links);
    const announced = copy.common.resultAnnouncement(result);
    if (result === "correct") return announced;
    const spoken = pairMatchMissedPairs(question, current.links)
      .map((pair) => copy.pairMatch.spokenPair(pair.word, pair.meaning))
      .join(" ");
    return `${announced} ${copy.pairMatch.missedPairs(spoken)}`;
  }
  if (current.links.length === previous.links.length + 1) {
    const added = current.links.find((entry) => !previous.links.includes(entry));
    const word = added === undefined ? undefined : question.words[added.word];
    const meaning = added === undefined ? undefined : question.meanings[added.meaning];
    if (word === undefined || meaning === undefined) return null;
    return copy.pairMatch.linked(word, meaning, current.links.length, question.words.length);
  }
  if (current.links.length + 1 === previous.links.length) {
    const removed = previous.links.find((entry) => !current.links.includes(entry));
    const word = removed === undefined ? undefined : question.words[removed.word];
    return word === undefined ? null : copy.pairMatch.unlinked(word);
  }
  return null;
}

export function pairMatchCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}
