// 에피소드 롤플레이의 순수 로직입니다 — 말하기 판정 · 턴 진행 · 표지 컷 잇기. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { NonEmpty } from "../../lib/non-empty";
import { judgeSpeaking, speakingWords } from "../../lib/speaking-judge";
import type { CatalogCuts } from "../catalog-cover/catalog-cover.contract";
import type { RoleplayTalkAction, RoleplayTalkState } from "./roleplay-story.contract";

export const initialRoleplayTalkState: RoleplayTalkState = {
  turnIndex: 0,
  phase: "ready",
  heard: "",
  verdict: null,
  hintShown: false,
  results: [],
  skippedCount: 0,
};

const nextTurn = (state: RoleplayTalkState, results: readonly AnswerResult[], skipped: number) => ({
  ...initialRoleplayTalkState,
  turnIndex: state.turnIndex + 1,
  results,
  skippedCount: state.skippedCount + skipped,
});

// 변화가 없으면 같은 참조를 돌려줍니다 — 늦게 온 인식 결과 · 두 번 누른 버튼이 상태를 흔들지 않습니다.
export function roleplayTalkReducer(
  state: RoleplayTalkState,
  action: RoleplayTalkAction,
): RoleplayTalkState {
  switch (action.type) {
    case "start":
      return state.phase === "ready" || state.phase === "unavailable"
        ? { ...state, phase: "listening" }
        : state;
    case "heard":
      return state.phase === "listening"
        ? { ...state, phase: "heard", heard: action.text, verdict: action.verdict }
        : state;
    case "unavailable":
      return state.phase === "listening" || state.phase === "ready"
        ? { ...state, phase: "unavailable" }
        : state;
    case "hint":
      return state.hintShown ? state : { ...state, hintShown: true };
    // 틀린 뒤 다시 말하기 — 판정을 지우고 준비로 돌아갑니다. 맞힌 뒤에는 다시 하지 않습니다.
    case "retry":
      return state.phase === "heard" && state.verdict === "incorrect"
        ? { ...state, phase: "ready", heard: "", verdict: null }
        : state;
    case "next":
      return state.phase === "heard" && state.verdict !== null
        ? nextTurn(state, [...state.results, state.verdict], 0)
        : state;
    // 말할 수 없음 · 인식 불가 — 판정 없이 넘깁니다. 듣는 중에는 받지 않습니다.
    case "skip":
      return state.phase === "listening" ? state : nextTurn(state, state.results, 1);
  }
}

/** 마지막 턴을 넘겼는가입니다. */
export function isRoleplayTalkDone(state: RoleplayTalkState, turnCount: number): boolean {
  return state.turnIndex >= turnCount;
}

function containsWildcard(word: string, wildcards: readonly string[]): boolean {
  return wildcards.some((wildcard) => wildcard !== "" && word.includes(wildcard));
}

// 이름 · 나라가 든 낱말은 빼고, 남은 낱말이 들은 문장에 차례대로 있으면 맞습니다.
function matchesWithWildcards(sentence: string, heard: string, wildcards: readonly string[]) {
  const pieces = wildcards.flatMap((wildcard) => speakingWords(wildcard));
  const required = speakingWords(sentence).filter((word) => !containsWildcard(word, pieces));
  const heardWords = speakingWords(heard);
  // 정답이 이름 · 나라뿐이면 남는 낱말이 없습니다 — 그때는 무언가 말했어야 맞습니다.
  if (required.length === 0) return heardWords.length > 0;
  let cursor = 0;
  for (const word of required) {
    const found = heardWords.indexOf(word, cursor);
    if (found < 0) return false;
    cursor = found + 1;
  }
  return true;
}

/**
 * 들은 문장을 받아들이는 정답들과 맞춥니다. 이름 · 나라가 없는 정답은 말하기 학습형과 같은 규칙
 * (`judgeSpeaking`)이고, 들어 있는 정답은 그 낱말만 빼고 봅니다.
 */
export function judgeRoleplayReply(
  accepted: NonEmpty<string>,
  heard: string,
  wildcards: readonly string[],
): AnswerResult {
  const pieces = wildcards.flatMap((wildcard) => speakingWords(wildcard));
  const correct = accepted.some((sentence) =>
    speakingWords(sentence).some((word) => containsWildcard(word, pieces))
      ? matchesWithWildcards(sentence, heard, wildcards)
      : judgeSpeaking(sentence, heard) === "correct",
  );
  return correct ? "correct" : "incorrect";
}

/**
 * 롤플레이 앞에 보일 표지 컷입니다. 표지의 마지막 컷이 첫 턴의 상대 대사와 같으면 그 컷은 첫 턴이
 * 대신하므로 뺍니다. 남는 컷이 없으면 `null` — 곧장 대화로 갑니다.
 */
export function roleplayStoryCutsOf(cuts: CatalogCuts, firstLine: string): CatalogCuts | null {
  const last = cuts[cuts.length - 1];
  const sameAsFirstTurn =
    last !== undefined && last.kind === "line" && last.text.ko.trim() === firstLine.trim();
  const kept = sameAsFirstTurn ? cuts.slice(0, -1) : [...cuts];
  const [first, ...rest] = kept;
  return first === undefined ? null : [first, ...rest];
}
