// 카탈로그 최종 테스트 화면의 순수 로직입니다. UI를 import하지 않습니다.

import { canCheckTiles, composeTileReply, judgeTileReply } from "@libitums/episode-core/judge";

import type { AnswerResult } from "../../lib/answer-result";
import type { AudioCue } from "../../lib/use-audio-cue";
import type {
  CatalogFinalAction,
  CatalogFinalState,
  CatalogRoleplayTurn,
} from "./catalog-final.contract";

export const initialCatalogFinalState: CatalogFinalState = {
  turnIndex: 0,
  placed: [],
  phase: "arranging",
  results: [],
};

export function catalogFinalReducer(
  state: CatalogFinalState,
  action: CatalogFinalAction,
): CatalogFinalState {
  switch (action.type) {
    case "toggleTile": {
      if (state.phase !== "arranging") return state;
      const placed = state.placed.includes(action.tileIndex)
        ? state.placed.filter((index) => index !== action.tileIndex)
        : [...state.placed, action.tileIndex];
      return { ...state, placed };
    }
    case "check":
      if (state.phase !== "arranging" || state.placed.length === 0) return state;
      return { ...state, phase: "checked", results: [...state.results, action.result] };
    case "nextTurn":
      if (state.phase !== "checked") return state;
      return {
        turnIndex: state.turnIndex + 1,
        placed: [],
        phase: "arranging",
        results: state.results,
      };
  }
}

// 타일 판정 셋의 몸은 `@libitums/episode-core/judge`에 있고(랜딩 체험판과 같은 규칙), 여기서는 턴을 풀어 넘깁니다.

/** 놓은 순서대로 타일 ko를 `" "`로 이은 대답입니다. */
export function composedReply(turn: CatalogRoleplayTurn, placed: readonly number[]): string {
  return composeTileReply(turn.tiles, placed);
}

export function canCheckTurn(turn: CatalogRoleplayTurn, placed: readonly number[]): boolean {
  return canCheckTiles(turn.tiles, placed);
}

export function judgeRoleplayTurn(
  turn: CatalogRoleplayTurn,
  placed: readonly number[],
): AnswerResult {
  return judgeTileReply(turn.tiles, placed, turn.accepted);
}

/** 턴 상태에서 지금 나야 할 소리입니다. 소리가 없으면 `null`입니다. */
export function catalogFinalAudioCueOf(
  turn: CatalogRoleplayTurn,
  state: CatalogFinalState,
): AudioCue | null {
  const { turnIndex } = state;
  // 정답 판정 직후에만 내 줄로 바뀝니다. 오답이거나 내 줄이 없으면 상대 줄 단서 그대로라 아무 일도 없습니다.
  if (
    state.phase === "checked" &&
    state.results[turnIndex] === "correct" &&
    turn.replyAudioSource !== undefined
  ) {
    return { key: `${turnIndex}:reply`, source: turn.replyAudioSource };
  }
  return turn.counterpartAudioSource === undefined
    ? null
    : { key: `${turnIndex}:counterpart`, source: turn.counterpartAudioSource };
}

export function isCatalogFinalComplete(state: CatalogFinalState, total: number): boolean {
  return state.turnIndex >= total;
}

export function catalogFinalLineAccessibilityLabel(
  turn: CatalogRoleplayTurn,
  counterpartName: string,
): string {
  return `${counterpartName}: ${turn.line.ko}${turn.line.en === null ? "" : ` ${turn.line.en}`}`;
}
