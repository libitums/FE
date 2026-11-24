// 합치기 퀴즈(ㄱ + ㅏ = 가)의 순수 상태입니다(ADR-0169). 음절 조립 형식 — 자음 칸 · 모음 칸이 다 차면 곧바로 판정하고,
// 맞으면 Next(마지막은 Done), 틀리면 Try again(칸을 비우고 같은 라운드)입니다. 한글은 배우는 내용입니다.

import { ANSWER_ECHO_DELAY_MS } from "../question-audio";
import { composeSyllable, isJamoConsonant } from "./jamo";

export type ComposeRound = {
  readonly consonant: string;
  readonly vowel: string;
  /** 「Make "ga"」의 로마자. */
  readonly roman: string;
};

/** 가 · 너 · 도(보드). */
export const COMPOSE_ROUNDS: readonly ComposeRound[] = [
  { consonant: "ㄱ", vowel: "ㅏ", roman: "ga" },
  { consonant: "ㄴ", vowel: "ㅓ", roman: "neo" },
  { consonant: "ㄷ", vowel: "ㅗ", roman: "do" },
];

/** 창고 타일 6장(보드 순서). */
export const COMPOSE_TILES: readonly string[] = ["ㅏ", "ㄷ", "ㄱ", "ㅗ", "ㄴ", "ㅓ"];

export type ComposeState = {
  readonly round: number;
  readonly consonant: string | null;
  readonly vowel: string | null;
  /** 이 라운드에서 틀린 적이 있는가. */
  readonly missed: boolean;
  /** 첫 시도에 맞힌 라운드 수 — 완료 이벤트. */
  readonly firstTry: number;
  readonly done: boolean;
};

export type ComposeAction =
  | { readonly type: "pick"; readonly letter: string }
  | { readonly type: "clear"; readonly slot: "consonant" | "vowel" }
  | { readonly type: "next" }
  | { readonly type: "retry" };

export const initialComposeState: ComposeState = {
  round: 0,
  consonant: null,
  vowel: null,
  missed: false,
  firstTry: 0,
  done: false,
};

export type ComposeVerdict = "correct" | "incorrect";

export function composeVerdictOf(state: ComposeState): ComposeVerdict | null {
  const round = COMPOSE_ROUNDS[state.round];
  if (round === undefined || state.consonant === null || state.vowel === null) return null;
  return state.consonant === round.consonant && state.vowel === round.vowel
    ? "correct"
    : "incorrect";
}

export type ComposeSlotState = "current" | "filled" | "empty" | "correct" | "incorrect";

export function composeSlotStateOf(
  state: ComposeState,
  slot: "consonant" | "vowel",
): ComposeSlotState {
  const value = slot === "consonant" ? state.consonant : state.vowel;
  const round = COMPOSE_ROUNDS[state.round];
  if (composeVerdictOf(state) !== null && round !== undefined)
    return value === (slot === "consonant" ? round.consonant : round.vowel)
      ? "correct"
      : "incorrect";
  if (value !== null) return "filled";
  // 지금 칸은 자음 칸이 비었으면 자음 칸, 아니면 모음 칸입니다.
  const current = state.consonant === null ? "consonant" : "vowel";
  return slot === current ? "current" : "empty";
}

export function composeReducer(state: ComposeState, action: ComposeAction): ComposeState {
  const verdict = composeVerdictOf(state);
  switch (action.type) {
    case "pick": {
      if (verdict !== null || state.done) return state;
      return isJamoConsonant(action.letter)
        ? { ...state, consonant: action.letter }
        : { ...state, vowel: action.letter };
    }
    case "clear": {
      if (verdict !== null) return state;
      return action.slot === "consonant"
        ? { ...state, consonant: null }
        : { ...state, vowel: null };
    }
    case "retry": {
      if (verdict !== "incorrect") return state;
      return { ...state, consonant: null, vowel: null, missed: true };
    }
    case "next": {
      if (verdict !== "correct") return state;
      const firstTry = state.firstTry + (state.missed ? 0 : 1);
      const round = state.round + 1;
      return {
        round: Math.min(round, COMPOSE_ROUNDS.length - 1),
        consonant: null,
        vowel: null,
        missed: false,
        firstTry,
        done: round >= COMPOSE_ROUNDS.length,
      };
    }
  }
}

/**
 * 정답 효과음(`correct_answer`) 뒤에 만든 음절을 들려 주기까지의 틈(ms, ADR-0173) — 레슨 정답 음성과 같은 값
 * (`ANSWER_ECHO_DELAY_MS`, ADR-0172). 효과음과 음절이 겹치지 않습니다.
 */
export const COMPOSE_ECHO_DELAY_MS = ANSWER_ECHO_DELAY_MS;

/** 이 상태에서 들려 줄 음절 — 맞힌 판정이면 그 라운드의 음절, 그 밖(판정 전 · 틀림 · 완료)은 null. */
export function composeEchoOf(state: ComposeState): string | null {
  const round = COMPOSE_ROUNDS[state.round];
  if (state.done || round === undefined || composeVerdictOf(state) !== "correct") return null;
  return composeSyllable(round.consonant, round.vowel);
}

/**
 * 라운드 음절(가 · 너 · 도)의 앱 내장 녹음 이름입니다(ADR-0173 ⟨2026-11-24⟩) — 호스트 음성 폴더의 `hangul-s-<로마자>.m4a`
 * (Android는 같은 폴더를 복사 — ADR-0045). ▶와 정답 뒤 음절 소리가 이 이름을 재생 모듈에 넘깁니다. 라운드 음절이 아니면 null.
 */
export function composeClipOf(syllable: string): string | null {
  for (const round of COMPOSE_ROUNDS)
    if (syllable !== "" && composeSyllable(round.consonant, round.vowel) === syllable)
      return `hangul-s-${round.roman}`;
  return null;
}
