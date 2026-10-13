// 콘텐츠 문항 하나를 학습 화면이 그릴 수 있는 문항으로 바꾸거나 사유와 함께 건너뜁니다(순수).
//
// 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import { isTypedAnswerAccepted } from "../lib/hangul-keyboard";
import type { LearningItem } from "../lib/episode-content.model";
import type { SentenceOrderQuestion } from "../screens/sentence-order/sentence-order-questions";
import { vocabCardItemOf } from "./catalog-card-map";
import {
  clozeItemOf,
  listeningItemOf,
  pictureChoiceItemOf,
  roleLineItemOf,
  translateToEnItemOf,
} from "./catalog-choice-map";
import { instructionOf, koOf, latinOf, optionalField, skippedItem } from "./catalog-item-text";
import type {
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";
import { pairMatchItemOf } from "./catalog-pair-map";
import { shuffledOrder } from "./catalog-shuffle";
import { typingItemOf } from "./catalog-typing-map";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

const sentenceOrder = (itemId: string, question: SentenceOrderQuestion): CatalogMappedItem => ({
  kind: "sentence-order",
  itemId,
  question,
});

/** 타일을 이어 맞추는 문장 순서입니다. 타일은 정답 순서로 실려 오므로 섞어 보입니다. */
function wordOrderItemOf(item: ItemOf<"WORD_ORDER">, port: CatalogItemPort): CatalogMappedItem {
  const tiles = item.tiles.map((tile) => koOf(port, tile.ko));
  const answers = item.answers.map((answer) => koOf(port, answer.ko));
  if (
    tiles.length === 0 ||
    tiles.includes("") ||
    !isTypedAnswerAccepted(tiles.join(" "), answers)
  ) {
    return skippedItem(item, "malformed");
  }
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, tiles.length);
  const english = latinOf(port, item.answers[0]?.en);
  return sentenceOrder(item.id, {
    prompt: english ?? koOf(port, item.prompt.ko),
    chips: order.map((index) => tiles[index] ?? ""),
    answerOrder: tiles.map((_, tile) => order.indexOf(tile)),
    ...optionalField("instruction", instructionOf(port, item.prompt)),
  });
}

const isPermutation = (values: readonly number[]): boolean =>
  [...values].sort((a, b) => a - b).every((value, index) => value === index);

/**
 * 대화 순서 맞추기입니다 — 대화 조립으로 그려집니다(지시문 말풍선 없이 칸마다 화자가 번갈아 섭니다). 정답
 * 인덱스는 원래 타일 기준이라 섞인 자리로 옮깁니다.
 */
function turnOrderItemOf(item: ItemOf<"TURN_ORDER">, port: CatalogItemPort): CatalogMappedItem {
  const tiles = item.tiles.map((tile) => koOf(port, tile.ko));
  const prompt = koOf(port, item.context.ko);
  const valid =
    tiles.length > 0 &&
    !tiles.includes("") &&
    prompt !== "" &&
    item.answer.length === tiles.length &&
    isPermutation(item.answer);
  if (!valid) return skippedItem(item, "malformed");
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, tiles.length);
  return sentenceOrder(item.id, {
    prompt,
    chips: order.map((index) => tiles[index] ?? ""),
    answerOrder: item.answer.map((tile) => order.indexOf(tile)),
    dialogue: true,
    ...optionalField("instruction", instructionOf(port, item.prompt)),
  });
}

export function catalogItemOf(item: LearningItem, port: CatalogLessonItemPort): CatalogMappedItem {
  switch (item.type) {
    case "LISTEN_SELECT":
      return listeningItemOf(item, port);
    case "ROLE_LINE":
      return roleLineItemOf(item, port);
    case "TRANSLATE_TO_EN":
      return translateToEnItemOf(item, port);
    case "CLOZE":
      return clozeItemOf(item, port);
    case "WORD_ORDER":
      return wordOrderItemOf(item, port);
    case "TURN_ORDER":
      return turnOrderItemOf(item, port);
    case "DICTATION":
    case "TRANSLATE_TO_KO":
    case "SENT_BUILD":
      return typingItemOf(item, port);
    case "ROLEPLAY_TURN":
      // 최종 테스트 문항은 최종 테스트 화면에서만 씁니다.
      return skippedItem(item, "malformed");
    case "VOCAB_CARD":
      return vocabCardItemOf(item, port);
    case "IMG_MATCH":
      return pictureChoiceItemOf(item, port);
    case "PAIR_MATCH":
      return pairMatchItemOf(item, port);
  }
}
