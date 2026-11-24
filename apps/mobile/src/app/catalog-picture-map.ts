// 그림 고르기(IMG_MATCH) 문항의 매핑입니다(순수). `catalog-choice-map`이 다시 내보냅니다.

import { choiceAudioField } from "./catalog-chip-audio";
import type { LearningItem, Option } from "../lib/episode-content.model";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";
import { audioField, catalogAnswerEchoOf } from "./catalog-item-audio";
import {
  choiceRomanizationsOf,
  englishOf,
  instructionOf,
  koOf,
  latinOf,
  optionalField,
  skippedItem,
} from "./catalog-item-text";
import type { CatalogLessonItemPort, CatalogMappedItem } from "./catalog-lesson-types";

type ItemOf<T extends LearningItem["type"]> = Extract<LearningItem, { type: T }>;

const hasTwo = (values: readonly string[]): values is readonly [string, string, ...string[]] =>
  values.length >= 2;
const correctIndex = (options: readonly Option[]): number =>
  options.findIndex((option) => option.correct);

/**
 * 그림 고르기입니다 — 그림이 붙은 단어 선택 문항이며 제시문은 정답 낱말의 영어 뜻입니다. 검사 순서는
 * 모양 → 그림 → 뜻입니다.
 */
export function pictureChoiceItemOf(
  item: ItemOf<"IMG_MATCH">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const choices = item.options.map((option) => koOf(port, option.ko));
  const answerIndex = correctIndex(item.options);
  if (!hasTwo(choices) || choices.includes("") || answerIndex < 0) {
    return skippedItem(item, "malformed");
  }
  const correct = item.options[answerIndex];
  const path = item.stimulus.imageUrl;
  const url = path === undefined ? null : port.imageUrlOf(path);
  if (url === null) return skippedItem(item, "image-missing");
  const prompt = englishOf(port, correct?.en) ?? port.glossOf(item.ref);
  if (prompt === undefined || prompt === null) return skippedItem(item, "no-gloss");
  const choiceRoms = choiceRomanizationsOf(
    port,
    item.options.map((option) => option.roman),
  );
  const question: WordChoiceQuestion = {
    prompt,
    choices,
    choicesSource: item.options.map((option) => option.ko),
    answerIndex,
    ...optionalField("instruction", instructionOf(port, item.prompt)),
    ...audioField(catalogAnswerEchoOf(item, port)),
    ...(choiceRoms === undefined ? {} : { choiceRomanizations: choiceRoms }),
    picture: { url, answerRomanization: latinOf(port, correct?.roman) ?? null },
    ...choiceAudioField(
      item.options.map((option) => option.ko),
      port,
    ),
  };
  return { kind: "word-choice", itemId: item.id, question };
}
