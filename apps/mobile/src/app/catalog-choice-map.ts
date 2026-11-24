// 보기를 고르는 문항(듣기 · 단어 선택)으로의 매핑입니다(순수).

import type { LearningItem, Option, Text } from "../lib/episode-content.model";
import type { QuestionAudio } from "../lib/question-audio";
import { clozeRomanizationOf, type TextSpan } from "../lib/romanization-segments";
import type { ListeningQuestion } from "../screens/listening/listening-questions";
import type {
  WordChoiceCulture,
  WordChoiceQuestion,
} from "../screens/word-choice/word-choice-questions";
import type {
  CatalogItemPort,
  CatalogLessonItemPort,
  CatalogMappedItem,
} from "./catalog-lesson-types";
import {
  choiceRomanizationsOf,
  englishOf,
  instructionOf,
  koOf,
  latinOf,
  optionalField,
  skippedItem,
} from "./catalog-item-text";
import {
  audioField,
  catalogAnswerEchoOf,
  catalogListenAudioOf,
  catalogRecordedEchoOf,
  catalogReplySelectAudioOf,
} from "./catalog-item-audio";
import { catalogChipAudioOf } from "./catalog-chip-audio";
import { shuffledOrder } from "./catalog-shuffle";

// 그림 고르기는 줄 수 상한 때문에 따로 둡니다 — 소비자는 그대로 이 모듈에서 가져갑니다.
export { pictureChoiceItemOf } from "./catalog-picture-map";

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
  item: ItemOf<"LISTEN_SELECT" | "MIN_PAIR_AB">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const options = item.options;
  if (options === undefined || options.length === 0) return skippedItem(item, "no-options");
  const line = item.stimulus.audio;
  const prompt = line === undefined ? "" : koOf(port, line.ko);
  const romanization = latinOf(port, line?.roman);
  const choices = options.map((option) => koOf(port, option.ko));
  const choiceRoms = choiceRomanizationsOf(
    port,
    options.map((option) => option.roman),
  );
  const answer = options.findIndex((option) => option.correct);
  if (prompt === "" || romanization === undefined || answer < 0 || choices.includes("")) {
    return skippedItem(item, "malformed");
  }
  // 보기가 둘 · 넷이 아니면 소리 사유보다 먼저 모양이 틀린 문항입니다.
  if (!isPair(choices) && !isQuad(choices)) return skippedItem(item, "malformed");
  // 소리가 없어도(받은 파일 없음 · 모듈 없음) 건너뛰지 않습니다 — audio가 null이면 대본이 보이는 제시로 섭니다(v4).
  const audio = catalogListenAudioOf(item, port);
  const common = {
    prompt,
    romanization,
    audio,
    choicesSource: options.map((option) => option.ko),
    ...optionalField("instruction", instructionOf(port, item.prompt)),
    ...(choiceRoms === undefined ? {} : { choiceRomanizations: choiceRoms }),
    // 답하기 전에는 대본을 보이지 않습니다 — 최소 대립쌍은 로마자가 곧 정답(소리 차이)이고, 듣고 고르기도 로마자가
    // 정답 문장 그대로라 듣기가 아니라 글자 맞추기가 됩니다(2026-11-02 문항 분석). 답한 뒤에는 한글 + 로마자가 섭니다.
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
  /** 보기마다 번역 줄입니다 — 있으면 길이 = `choices.length`입니다. */
  readonly choiceTranslations?: readonly string[] | undefined;
  /** 보기마다 로마자 줄입니다 — 있으면 길이 = `choices.length`입니다. */
  readonly choiceRomanizations?: readonly (string | null)[] | undefined;
  /** 소리가 있으면 싣습니다(없으면 키 자체를 싣지 않습니다). */
  readonly audio?: QuestionAudio | null | undefined;
  /** 로마자 줄 안 정답 자리입니다(빈칸 채우기). */
  readonly romanizationEmphasis?: TextSpan | undefined;
  /** 있으면 `prompt.en` 대신 서는 지시문입니다. */
  readonly instruction?: string | undefined;
  /** 문화 확인이면 장면 · 해설입니다. */
  readonly culture?: WordChoiceCulture | undefined;
  readonly choicesSource?: readonly string[] | undefined; // 치환 전 원문(측정용, ADR-0084)
};

export function wordChoiceItem(
  item: LearningItem,
  port: CatalogItemPort & Partial<Pick<CatalogLessonItemPort, "audioUrlOf" | "recordedAudioOf">>,
  promptText: Text,
  parts: WordChoiceParts,
): CatalogMappedItem {
  const { prompt, choices, answerIndex } = parts;
  if (prompt === "" || !hasTwo(choices) || choices.includes("")) {
    return skippedItem(item, "malformed");
  }
  if (answerIndex < 0 || answerIndex >= choices.length) return skippedItem(item, "malformed");
  // 보기마다 낱말 소리(ADR-0189) — 치환 전 원문으로 이 에피소드 녹음을 찾습니다.
  const choiceAudio =
    port.audioUrlOf === undefined || parts.choicesSource?.length !== choices.length
      ? null
      : catalogChipAudioOf(parts.choicesSource, { ...port, audioUrlOf: port.audioUrlOf });
  const question: WordChoiceQuestion = {
    prompt,
    choices,
    answerIndex,
    ...optionalField("romanization", parts.romanization),
    ...optionalField("translation", parts.translation),
    ...optionalField("instruction", parts.instruction ?? instructionOf(port, promptText)),
    ...audioField(parts.audio ?? null),
    ...(parts.romanizationEmphasis === undefined
      ? {}
      : { romanizationEmphasis: parts.romanizationEmphasis }),
    ...(parts.choiceRomanizations !== undefined &&
    parts.choiceRomanizations.length === choices.length
      ? { choiceRomanizations: parts.choiceRomanizations }
      : {}),
    ...(parts.culture === undefined ? {} : { culture: parts.culture }),
    ...(parts.choicesSource !== undefined && parts.choicesSource.length === choices.length
      ? { choicesSource: parts.choicesSource }
      : {}),
    ...(parts.choiceTranslations !== undefined && parts.choiceTranslations.length === choices.length
      ? { choiceTranslations: parts.choiceTranslations }
      : {}),
    ...(choiceAudio === null ? {} : { choiceAudio }),
  };
  return { kind: "word-choice", itemId: item.id, question };
}

const correctIndex = (options: readonly Option[]): number =>
  options.findIndex((option) => option.correct);

/** 상대 대사에 답하는 보기 고르기입니다. */
export function roleLineItemOf(
  item: ItemOf<"ROLE_LINE">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, item.context.ko),
    romanization: latinOf(port, item.context.roman),
    translation: englishOf(port, item.context.en),
    choices: item.options.map((option) => koOf(port, option.ko)),
    choicesSource: item.options.map((option) => option.ko),
    choiceRomanizations: choiceRomanizationsOf(
      port,
      item.options.map((option) => option.roman),
    ),
    answerIndex: correctIndex(item.options),
    audio: catalogRecordedEchoOf(item, port),
  });
}

/** 한국어 낱말의 영어 뜻 고르기입니다 — 영어 보기가 `ko` 자리에 옵니다. */
export function translateToEnItemOf(
  item: ItemOf<"TRANSLATE_TO_EN">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const text = item.stimulus.text;
  return wordChoiceItem(item, port, item.prompt, {
    prompt: text === undefined ? "" : koOf(port, text.ko),
    romanization: latinOf(port, text?.roman),
    choices: item.options.map((option) => latinOf(port, option.ko) ?? ""),
    choicesSource: item.options.map((option) => option.ko),
    answerIndex: correctIndex(item.options),
    audio: catalogAnswerEchoOf(item, port),
  });
}

/** 빈칸 채우기입니다 — 타일이 보기이고, 타일은 정답 순서로 실려 오므로 섞습니다. */
export function clozeItemOf(item: ItemOf<"CLOZE">, port: CatalogLessonItemPort): CatalogMappedItem {
  const tiles = item.tiles.map((tile) => koOf(port, tile.ko));
  const answer = item.answers[0] === undefined ? "" : koOf(port, item.answers[0].ko);
  const order = shuffledOrder(`${port.episodeId}/${item.id}`, tiles.length);
  const choices = order.map((index) => tiles[index] ?? "");
  const contextRoman = latinOf(port, item.context.roman);
  const filled =
    contextRoman === undefined
      ? undefined
      : clozeRomanizationOf(contextRoman, latinOf(port, item.answers[0]?.roman));
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, item.context.ko),
    romanization: filled?.text,
    romanizationEmphasis: filled?.emphasis,
    translation: englishOf(port, item.context.en),
    choices,
    choicesSource: order.map((index) => item.tiles[index]?.ko ?? ""),
    choiceRomanizations: choiceRomanizationsOf(
      port,
      order.map((index) => item.tiles[index]?.roman),
    ),
    answerIndex: answer === "" ? -1 : choices.indexOf(answer),
    audio: catalogRecordedEchoOf(item, port),
  });
}

/** 문장 속 빈칸을 고르는 단어 선택입니다(CLOZE_CHOICE). */
export function clozeChoiceItemOf(
  item: ItemOf<"CLOZE_CHOICE">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, item.context.ko),
    romanization: latinOf(port, item.context.roman),
    translation: englishOf(port, item.context.en),
    choices: item.options.map((option) => koOf(port, option.ko)),
    choicesSource: item.options.map((option) => option.ko),
    choiceRomanizations: choiceRomanizationsOf(
      port,
      item.options.map((option) => option.roman),
    ),
    answerIndex: correctIndex(item.options),
    audio: catalogRecordedEchoOf(item, port),
  });
}

/** 상대 말에 답하는 보기 고르기입니다(REPLY_SELECT) — 상대 말을 글로 보입니다. */
export function replySelectItemOf(
  item: ItemOf<"REPLY_SELECT">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const line = item.stimulus.audio;
  if (line === undefined) return skippedItem(item, "malformed");
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, line.ko),
    romanization: latinOf(port, line.roman),
    translation: englishOf(port, line.en),
    choices: item.options.map((option) => koOf(port, option.ko)),
    choicesSource: item.options.map((option) => option.ko),
    choiceRomanizations: choiceRomanizationsOf(
      port,
      item.options.map((option) => option.roman),
    ),
    answerIndex: correctIndex(item.options),
    audio: catalogReplySelectAudioOf(item, port),
  });
}

/** 조사를 고치거나 채우는 단어 선택입니다(PARTICLE_FILL · PARTICLE_SWAP). */
export function particleItemOf(
  item: ItemOf<"PARTICLE_FILL" | "PARTICLE_SWAP">,
  port: CatalogLessonItemPort,
): CatalogMappedItem {
  const text = item.stimulus.text;
  if (text === undefined) return skippedItem(item, "malformed");
  return wordChoiceItem(item, port, item.prompt, {
    prompt: koOf(port, text.ko),
    romanization: latinOf(port, text.roman),
    translation: englishOf(port, text.en),
    choices: item.options.map((option) => koOf(port, option.ko)),
    choicesSource: item.options.map((option) => option.ko),
    choiceRomanizations: choiceRomanizationsOf(
      port,
      item.options.map((option) => option.roman),
    ),
    answerIndex: correctIndex(item.options),
    audio: catalogRecordedEchoOf(item, port),
  });
}
