import "background-only";

import type { DeliveryItem } from "./episode-content.schema";
import type { LearningItem, Text } from "./episode-content.model";
import { toAddedItem } from "./episode-content.items-added";
import {
  maybe,
  nonEmpty,
  optText,
  toOption,
  toStimulus,
  toText,
  toTexts,
  type WireText,
} from "./episode-content.normalize";

// 문항 변환과 문자열 정답(TURN_ORDER · PAIR_MATCH) 풀이입니다.

const ID_SEPARATOR = " | ";

export function byKey<T>(key: (value: T) => number) {
  return (a: T, b: T): number => key(a) - key(b);
}

/** 조각이 `tiles[].ko`에 정확히 한 번 있으면 그 인덱스, 아니면 -1. */
export function uniqueTileIndex(tiles: { ko: string }[], ko: string): number {
  const first = tiles.findIndex((tile) => tile.ko === ko);
  if (first === -1) {
    return -1;
  }
  return tiles.findIndex((tile, index) => index > first && tile.ko === ko) === -1 ? first : -1;
}

/** TURN_ORDER 정답 문자열 `"A | B | C"`를 tiles 인덱스 배열로. 풀 수 없으면 undefined. */
export function resolveTurnOrder(
  tiles: { ko: string }[],
  answer: string | undefined,
): number[] | undefined {
  if (answer === undefined) {
    return undefined;
  }
  const pieces = answer.split(ID_SEPARATOR);
  if (pieces.length !== tiles.length) {
    return undefined;
  }
  const indices = pieces.map((piece) => uniqueTileIndex(tiles, piece));
  return indices.includes(-1) ? undefined : indices;
}

/** PAIR_MATCH 정답 문자열 `"left=right | …"`를 짝 배열로(정답 문자열의 순서). */
export function resolvePairs(
  tiles: (WireText & { roman: string })[],
  answer: string | undefined,
): { left: Text; right: string }[] | undefined {
  if (answer === undefined) {
    return undefined;
  }
  const pieces = answer.split(ID_SEPARATOR);
  if (pieces.length !== tiles.length) {
    return undefined;
  }
  const pairs: { left: Text; right: string }[] = [];
  for (const piece of pieces) {
    const cut = piece.indexOf("=");
    if (cut === -1) {
      return undefined;
    }
    const tile = tiles[uniqueTileIndex(tiles, piece.slice(0, cut))];
    if (tile === undefined) {
      return undefined;
    }
    pairs.push({ left: toText(tile), right: piece.slice(cut + 1) });
  }
  return pairs;
}

export function toItem(item: DeliveryItem): LearningItem {
  const base = { id: item.id, event: item.event, ...maybe("ref", nonEmpty(item.ref)) };
  switch (item.type) {
    case "VOCAB_CARD":
      return {
        ...base,
        type: item.type,
        context: toText(item.context),
        ...maybe("example", optText(item.example)),
        cardKind: item.card_kind,
      };
    case "CLOZE":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        tiles: toTexts(item.tiles),
        answers: toTexts(item.answers),
      };
    case "IMG_MATCH":
    case "TRANSLATE_TO_EN":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        stimulus: toStimulus(item.stimulus),
        options: item.options.map(toOption),
      };
    case "WORD_ORDER":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        tiles: toTexts(item.tiles),
        answers: toTexts(item.answers),
      };
    case "LISTEN_SELECT":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        ...maybe("context", optText(item.context)),
        stimulus: toStimulus(item.stimulus),
        ...maybe("options", item.options?.map(toOption)),
      };
    case "TURN_ORDER":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        tiles: toTexts(item.tiles),
        answer: resolveTurnOrder(item.tiles, item.answers[0]?.ko) ?? [],
      };
    case "ROLE_LINE":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        options: item.options.map(toOption),
        feedback: {
          correct: toText(item.feedback.correct),
          ...maybe("wrong", optText(item.feedback.wrong)),
          ...maybe("wrongOption", item.feedback.wrong_option),
        },
      };
    case "TRANSLATE_TO_KO":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        answers: toTexts(item.answers),
      };
    case "DICTATION":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        stimulus: toStimulus(item.stimulus),
        answers: toTexts(item.answers),
      };
    case "SENT_BUILD":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        answers: toTexts(item.answers),
      };
    case "PAIR_MATCH":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        tiles: toTexts(item.tiles),
        pairs: resolvePairs(item.tiles, item.answers[0]?.ko) ?? [],
      };
    case "ROLEPLAY_TURN":
      return {
        ...base,
        type: item.type,
        prompt: toText(item.prompt),
        context: toText(item.context),
        stimulus: toStimulus(item.stimulus),
        tiles: toTexts(item.tiles),
        answers: toTexts(item.answers),
        feedback: { correct: toText(item.feedback.correct) },
        roleplay: {
          lineId: item.roleplay.line_id,
          tilesGloss: item.roleplay.tiles_gloss.map((gloss) => ({
            tile: gloss.tile,
            ...maybe("en", gloss.en),
          })),
        },
      };
    default:
      return toAddedItem(item);
  }
}
