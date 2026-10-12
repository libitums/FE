// 보기를 고르는 문항(듣기 · 단어 선택)으로의 매핑입니다(순수).

import type { LearningItem, Option, Text } from "../lib/episode-content.model";
import type { ListeningQuestion } from "../screens/listening/listening-questions";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";
import type { CatalogItemPort, CatalogMappedItem } from "./catalog-lesson-types";
import { instructionOf, koOf, latinOf, optionalField, skippedItem } from "./catalog-item-text";
import { shuffledOrder } from "./catalog-shuffle";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

const hasTwo = (values: readonly string[]): values is readonly [string, string, ...string[]] =>
  values.length >= 2;
const isPair = (values: readonly string[]): values is readonly [string, string] =>
  values.length === 2;
const isQuad = (values: readonly string[]): values is readonly [string, string, string, string] =>
  values.length === 4;
const slotOfFour = (index: number): 0 | 1 | 2 | 3 =>
  index === 0 ? 0 : index === 1 ? 1 : index === 2 ? 2 : 3;

export function listeningItemOf(
  item: ItemOf<"LISTEN_SELECT">,
  port: CatalogItemPort,
): CatalogMappedItem {
  const options = item.options;
  if (options === undefined || options.length === 0) return skippedItem(item, "no-options");
  const audio = item.stimulus.audio;
  const prompt = audio === undefined ? "" : koOf(port, audio.ko);
  const romanization = latinOf(port, audio?.roman);
  const choices = options.map((option) => koOf(port, option.ko));
  const answer = options.findIndex((option) => option.correct);
  if (prompt === "" || romanization === undefined || answer < 0 || choices.includes("")) {
    return skippedItem(item, "malformed");
  }
  const common = {
    prompt,
    romanization,
    audioSource: null,
    ...optionalField("instruction", instructionOf(port, item.prompt)),
  };
  let question: ListeningQuestion;
  if (isPair(choices)) {
    question = { ...common, choices, answerIndex: answer === 0 ? 0 : 1 };
  } else if (isQuad(choices)) {
    question = { ...common, choices, answerIndex: slotOfFour(answer) };
  } else {
    return skippedItem(item, "malformed");
  }
  return { kind: "listening", itemId: item.id, question };
}

type WordChoiceParts = {
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly answerIndex: number;
  readonly romanization?: string | undefined;
  readonly translation?: string | undefined;
};

function wordChoiceItem(
  item: LearningItem,
  port: CatalogItemPort,
  promptText: Text,
  parts: WordChoiceParts,
): CatalogMappedItem {
  const { prompt, choices, answerIndex } = parts;
  if (prompt === "" || !hasTwo(choices) || choices.includes("")) {
    return skippedItem(item, "malformed");
  }
  if (answerIndex < 0 || answerIndex >= choices.length) return skippedItem(item, "malformed");
  const question: WordChoiceQuestion = {
    prompt,
    choices,
    answerIndex,
    ...optionalField("romanization", parts.romanization),
    ...optionalField("translation", parts.translation),
    ...optionalField("instruction", instructionOf(port, promptText)),
  };
  return { kind: "word-choice", itemId: item.id, question };
}

const correctIndex = (options: readonly Option[]): number =>
  options.findIndex((option) => option.correct);

/** 상대 대사에 답하는 보기 고르기입니다. */
export function roleLineItemOf(
  item: ItemOf<"ROLE_LINE">,
  port: CatalogItemPort,
): CatalogMappedItem {
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, item.context.ko),
    romanization: latinOf(port, item.context.roman),
    translation: latinOf(port, item.context.en),
    choices: item.options.map((option) => koOf(port, option.ko)),
    answerIndex: correctIndex(item.options),
  });
}

/** 한국어 낱말의 영어 뜻 고르기입니다 — 영어 보기가 `ko` 자리에 옵니다. */
export function translateToEnItemOf(
  item: ItemOf<"TRANSLATE_TO_EN">,
  port: CatalogItemPort,
): CatalogMappedItem {
  const text = item.stimulus.text;
  return wordChoiceItem(item, port, item.prompt, {
    prompt: text === undefined ? "" : koOf(port, text.ko),
    romanization: latinOf(port, text?.roman),
    choices: item.options.map((option) => latinOf(port, option.ko) ?? ""),
    answerIndex: correctIndex(item.options),
  });
}

/** 빈칸 채우기입니다 — 타일이 보기이고, 타일은 정답 순서로 실려 오므로 섞습니다. */
export function clozeItemOf(item: ItemOf<"CLOZE">, port: CatalogItemPort): CatalogMappedItem {
  const tiles = item.tiles.map((tile) => koOf(port, tile.ko));
  const answer = item.answers[0] === undefined ? "" : koOf(port, item.answers[0].ko);
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, tiles.length);
  const choices = order.map((index) => tiles[index] ?? "");
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, item.context.ko),
    romanization: latinOf(port, item.context.roman),
    translation: latinOf(port, item.context.en),
    choices,
    answerIndex: answer === "" ? -1 : choices.indexOf(answer),
  });
}
