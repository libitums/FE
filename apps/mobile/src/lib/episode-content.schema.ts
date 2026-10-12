import "background-only";

// delivery-2 에피소드 JSON의 **와이어 스키마**입니다 — 받은 모양 그대로를 검사합니다.
// 정본은 `docs/specs/episode-content-json-contract.md` §2 ~ §8(관찰값)이고, 앱이 쓰는
// 모양으로의 변환은 `episode-content.ts`의 `decodeEpisode`가 맡습니다(와이어/도메인 분리).
//
// 백그라운드 전용입니다. zod는 메인 스레드 번들에 실리지 않습니다 — 첫 줄의
// `background-only`가 메인 스레드 import를 빌드 오류로 막습니다(`posthog-client.ts` 선례).
// `src/` 안에서 zod를 import하는 파일은 이 하나뿐이어야 합니다(unit 테스트가 고정).
import { z } from "zod/mini";

/** 문항 `type`의 닫힌 목록 — 계약 문서 §7.2의 13종, 이 순서. */
export const KNOWN_ITEM_TYPES = [
  "VOCAB_CARD",
  "CLOZE",
  "IMG_MATCH",
  "WORD_ORDER",
  "LISTEN_SELECT",
  "TURN_ORDER",
  "ROLE_LINE",
  "TRANSLATE_TO_KO",
  "TRANSLATE_TO_EN",
  "DICTATION",
  "SENT_BUILD",
  "PAIR_MATCH",
  "ROLEPLAY_TURN",
] as const;

const optionalString = z.optional(z.string());

/** 컷 · 대화 · tiles · answers 등 — 관찰에서 `en`이 없던 자리도 있으나 있으면 보존합니다. */
const textSchema = z.object({
  ko: z.string(),
  roman: z.string(),
  en: optionalString,
});

/** `prompt`만 로마자가 없고 영어가 필수입니다. */
const promptSchema = z.object({ ko: z.string(), en: z.string() });

const optionSchema = z.object({
  id: z.string(),
  ko: z.string(),
  roman: z.string(),
  en: optionalString,
  correct: z.boolean(),
  why_wrong: optionalString,
});

/** 정답(`correct === true`)이 정확히 하나여야 합니다. 디코더가 이 message로 코드를 고릅니다. */
const optionsSchema = z.array(optionSchema).check(
  z.refine((options) => options.filter((option) => option.correct).length === 1, {
    message: "option-correct-count",
  }),
);

const stimulusSchema = z.object({
  audio: z.optional(textSchema),
  text: z.optional(textSchema),
  image_brief: optionalString,
  audio_url: optionalString,
  image_url: optionalString,
});

const cutCommon = {
  index: z.int(),
  kind: z.enum(["pre", "post"]),
  image_brief: z.string(),
  image_url: z.string(),
};

const cutSchema = z.discriminatedUnion("cut_kind", [
  z.object({
    ...cutCommon,
    cut_kind: z.literal("speech"),
    speaker: z.string(),
    line: textSchema,
    aside: textSchema,
  }),
  z.object({
    ...cutCommon,
    cut_kind: z.literal("monologue"),
    speaker: z.string(),
    line: textSchema,
  }),
  z.object({
    ...cutCommon,
    cut_kind: z.literal("narration"),
    narration: textSchema,
  }),
]);

const dialogueLineSchema = z.object({
  seq: z.int(),
  role: z.enum(["counterpart", "player"]),
  text: textSchema,
  audio_url: z.string(),
  textbook: z.optional(textSchema),
});

const itemCommon = {
  id: z.string(),
  mode: z.string(),
  event: z.enum(["E", "R"]),
  ref: optionalString,
};

const itemSchema = z.discriminatedUnion("type", [
  z.object({
    ...itemCommon,
    type: z.literal("VOCAB_CARD"),
    context: textSchema,
    example: textSchema,
    card_kind: z.string(),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("CLOZE"),
    prompt: promptSchema,
    context: textSchema,
    tiles: z.array(textSchema),
    answers: z.array(textSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("IMG_MATCH"),
    prompt: promptSchema,
    stimulus: stimulusSchema,
    options: optionsSchema,
  }),
  z.object({
    ...itemCommon,
    type: z.literal("WORD_ORDER"),
    prompt: promptSchema,
    tiles: z.array(textSchema),
    answers: z.array(textSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("LISTEN_SELECT"),
    prompt: promptSchema,
    context: z.optional(textSchema),
    stimulus: stimulusSchema,
    options: z.optional(optionsSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("TURN_ORDER"),
    prompt: promptSchema,
    context: textSchema,
    tiles: z.array(textSchema),
    answers: z.array(textSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("ROLE_LINE"),
    prompt: promptSchema,
    context: textSchema,
    options: optionsSchema,
    feedback: z.object({
      correct: z.object({ ko: z.string(), en: optionalString }),
      wrong: z.optional(z.object({ ko: z.string() })),
      wrong_option: optionalString,
    }),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("TRANSLATE_TO_KO"),
    prompt: promptSchema,
    answers: z.array(textSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("TRANSLATE_TO_EN"),
    prompt: promptSchema,
    stimulus: stimulusSchema,
    options: optionsSchema,
  }),
  z.object({
    ...itemCommon,
    type: z.literal("DICTATION"),
    prompt: promptSchema,
    stimulus: stimulusSchema,
    answers: z.array(textSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("SENT_BUILD"),
    prompt: promptSchema,
    context: textSchema,
    answers: z.array(textSchema),
  }),
  z.object({
    ...itemCommon,
    type: z.literal("PAIR_MATCH"),
    prompt: promptSchema,
    tiles: z.array(textSchema),
    tiles_gloss_en: z.string(),
    answers: z.array(textSchema),
  }),
  // 최종 테스트(RP) 문항은 콘텐츠 쪽이 수정 중이라 `id`와 `type`만 검사하고 나머지는 통과시킵니다.
  z.looseObject({ id: z.string(), type: z.literal("ROLEPLAY_TURN") }),
]);

const stepSchema = z.object({
  id: z.string(),
  order: z.int(),
  items: z.array(itemSchema),
});

const wordSchema = z.object({
  id: z.string(),
  ko: z.string(),
  roman: z.string(),
  gloss_en: z.string(),
  role: z.enum(["target", "exposure", "contrast", "prereq"]),
  grade: optionalString,
  example_ko: optionalString,
  example_roman: optionalString,
});

const patternSchema = z.object({
  id: z.string(),
  ko: z.string(),
  roman: z.string(),
  gloss_en: z.string(),
});

export const deliveryEpisodeSchema = z.object({
  schema: z.literal("delivery-2"),
  unit_id: z.string(),
  title: z.string(),
  day: z.int(),
  time_of_day: z.string(),
  place: z.string(),
  counterpart: z.string(),
  pre_cuts: z.array(cutSchema),
  dialogue: z.array(dialogueLineSchema),
  post_cuts: z.array(cutSchema),
  steps: z.array(stepSchema),
  words: z.array(wordSchema),
  patterns: z.array(patternSchema),
});

export type DeliveryText = z.infer<typeof textSchema>;
export type DeliveryOption = z.infer<typeof optionSchema>;
export type DeliveryCut = z.infer<typeof cutSchema>;
export type DeliveryDialogueLine = z.infer<typeof dialogueLineSchema>;
export type DeliveryItem = z.infer<typeof itemSchema>;
export type DeliveryStep = z.infer<typeof stepSchema>;
export type DeliveryWord = z.infer<typeof wordSchema>;
export type DeliveryPattern = z.infer<typeof patternSchema>;
export type DeliveryEpisodeV2 = z.infer<typeof deliveryEpisodeSchema>;
