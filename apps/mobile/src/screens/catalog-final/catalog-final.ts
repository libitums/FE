// 카탈로그 최종 테스트 화면의 순수 로직입니다. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
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
  _action: CatalogFinalAction,
): CatalogFinalState {
  return state;
}

/** 놓은 순서대로 타일 ko를 `" "`로 이은 대답입니다. */
export function composedReply(_turn: CatalogRoleplayTurn, _placed: readonly number[]): string {
  return "";
}

export function canCheckTurn(_turn: CatalogRoleplayTurn, _placed: readonly number[]): boolean {
  return false;
}

export function judgeRoleplayTurn(
  _turn: CatalogRoleplayTurn,
  _placed: readonly number[],
): AnswerResult {
  return "incorrect";
}

export function isCatalogFinalComplete(_state: CatalogFinalState, _total: number): boolean {
  return false;
}

export function catalogFinalLineAccessibilityLabel(
  _turn: CatalogRoleplayTurn,
  _counterpartName: string,
): string {
  return "";
}
