// 타일로 지은 답의 판정입니다 — 앱의 카탈로그 최종 테스트와 랜딩 체험판의 타일 대체가 같습니다(순수).

import type { AnswerResult } from "./answer-result";
import { isTypedAnswerAccepted } from "./typed-answer";

/** 판정에 쓰는 타일 — 한국어 글만 봅니다. */
export type ReplyTile = { readonly ko: string };

/** 놓은 순서대로 타일 ko를 `" "`로 이은 대답입니다. */
export function composeTileReply(tiles: readonly ReplyTile[], placed: readonly number[]): string {
  return placed.map((index) => tiles[index]?.ko ?? "").join(" ");
}

/** 타일을 전부 놓았을 때만 확인할 수 있습니다. */
export function canCheckTiles(tiles: readonly ReplyTile[], placed: readonly number[]): boolean {
  return placed.length === tiles.length;
}

/** 지은 대답이 받아 주는 답 중 하나와 같은 말이면 correct입니다. */
export function judgeTileReply(
  tiles: readonly ReplyTile[],
  placed: readonly number[],
  accepted: readonly string[],
): AnswerResult {
  return isTypedAnswerAccepted(composeTileReply(tiles, placed), accepted) ? "correct" : "incorrect";
}
