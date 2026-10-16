// 보기를 고르는 문항(듣기 · 단어 선택)으로의 매핑입니다(순수).

import type { LearningItem, Option, Text } from "../lib/episode-content.model";
import type { ListeningQuestion } from "../screens/listening/listening-questions";
import type { WordChoiceQuestion } from "../screens/word-choice/word-choice-questions";
import type {
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";
import {
  englishOf,
  instructionOf,
  koOf,
  latinOf,
  optionalField,
  skippedItem,
} from "./catalog-item-text";
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

/**
 * 그 문항의 재생 출처입니다. 학습 문항의 음성은 아직 연결하지 않아(콘텐츠의 `audio_url`을 쓰지 않습니다 —
 * 컷 · 최종 테스트만 버킷 음성을 씁니다, ADR-0060) 늘 `null`입니다. 학습 문항 오디오 작업이 이 자리를 채웁니다.
 */
function audioSourceOf(_item: ItemOf<"LISTEN_SELECT" | "MIN_PAIR_AB">): string | null {
  return null;
}

export function listeningItemOf(
  item: ItemOf<"LISTEN_SELECT" | "MIN_PAIR_AB">,
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
  // 보기가 둘 · 넷이 아니면 소리 사유보다 먼저 모양이 틀린 문항입니다.
  if (!isPair(choices) && !isQuad(choices)) return skippedItem(item, "malformed");
  // 모양이 맞아도 소리가 없는 듣기는 3c에서 보이지 않습니다(E-2) — 오디오가 연결되면 자동으로 섭니다.
  const audioSource = audioSourceOf(item);
  if (audioSource === null) return skippedItem(item, "audio-missing");
  const common = {
    prompt,
    romanization,
    audioSource,
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
    translation: englishOf(port, item.context.en),
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
    translation: englishOf(port, item.context.en),
    choices,
    answerIndex: answer === "" ? -1 : choices.indexOf(answer),
  });
}

/** 문장 속 빈칸을 고르는 단어 선택입니다(CLOZE_CHOICE). */
export function clozeChoiceItemOf(
  item: ItemOf<"CLOZE_CHOICE">,
  _port: CatalogItemPort,
): CatalogMappedItem {
  return skippedItem(item, "malformed");
}

/** 상대 말에 답하는 보기 고르기입니다(REPLY_SELECT) — 상대 말을 글로 보입니다. */
export function replySelectItemOf(
  item: ItemOf<"REPLY_SELECT">,
  _port: CatalogItemPort,
): CatalogMappedItem {
  return skippedItem(item, "malformed");
}

/** 조사를 고치거나 채우는 단어 선택입니다(PARTICLE_FILL · PARTICLE_SWAP). */
export function particleItemOf(
  item: ItemOf<"PARTICLE_FILL" | "PARTICLE_SWAP">,
  _port: CatalogItemPort,
): CatalogMappedItem {
  return skippedItem(item, "malformed");
}

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
  const question: WordChoiceQuestion = {
    prompt,
    choices,
    answerIndex,
    ...optionalField("instruction", instructionOf(port, item.prompt)),
    picture: { url, answerRomanization: latinOf(port, correct?.roman) ?? null },
  };
  return { kind: "word-choice", itemId: item.id, question };
}
