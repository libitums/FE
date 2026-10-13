// 카탈로그 최종 테스트 화면의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import { isTypedAnswerAccepted } from "../../lib/hangul-keyboard";
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

/** 놓은 순서대로 타일 ko를 `" "`로 이은 대답입니다. */
export function composedReply(turn: CatalogRoleplayTurn, placed: readonly number[]): string {
  return placed.map((index) => turn.tiles[index]?.ko ?? "").join(" ");
}

export function canCheckTurn(turn: CatalogRoleplayTurn, placed: readonly number[]): boolean {
  return placed.length === turn.tiles.length;
}

export function judgeRoleplayTurn(
  turn: CatalogRoleplayTurn,
  placed: readonly number[],
): AnswerResult {
  return isTypedAnswerAccepted(composedReply(turn, placed), turn.accepted)
    ? "correct"
    : "incorrect";
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
