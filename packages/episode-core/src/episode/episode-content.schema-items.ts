// 2026-10-15에 더한 문항 11종의 와이어 스키마입니다.
import { z } from "zod/mini";
import {
  choiceFeedbackSchema,
  correctFeedbackSchema,
  itemCommon,
  optionsSchema,
  promptSchema,
  stimulusSchema,
  textSchema,
} from "./episode-content.schema-parts";

export const ADDED_ITEM_TYPES = [
  "CLOZE_CHOICE",
  "REPLY_SELECT",
  "MIN_PAIR_AB",
  "PARTICLE_FILL",
  "PARTICLE_SWAP",
  "CULTURE_CHECK",
  "CULTURE_CARD",
  "LISTEN_BUILD",
  "SYLLABLE_BUILD",
  "SHADOW",
  "SPEAK_WORD",
  // 2026-10-30(balance) — 이야기 파이널의 따라 쓰기입니다.
  "HANGUL_WRITE",
] as const;

const stimulusChoice = {
  ...itemCommon,
  prompt: promptSchema,
  stimulus: stimulusSchema,
  options: optionsSchema,
  feedback: correctFeedbackSchema,
};
const tilesBuild = {
  ...itemCommon,
  prompt: promptSchema,
  stimulus: stimulusSchema,
  // 이야기 빈칸(level-3 S8)은 `___`이 든 문맥을 싣습니다.
  context: z.optional(textSchema),
  tiles: z.array(textSchema),
  answers: z.array(textSchema),
};
const speech = {
  ...itemCommon,
  prompt: promptSchema,
  stimulus: stimulusSchema,
  answers: z.array(textSchema),
};

export const addedItemSchemas = [
  z.object({
    ...itemCommon,
    type: z.literal("CLOZE_CHOICE"),
    prompt: promptSchema,
    context: textSchema,
    options: optionsSchema,
    answers: z.array(textSchema),
    // balance의 이야기 빈칸은 해설이 없습니다.
    feedback: z.optional(correctFeedbackSchema),
  }),
  // 이야기 대답 고르기는 `stimulus` 없이 상대 말을 `context`로 싣고, 해설에 틀림 줄이 올 수 있습니다.
  z.object({
    ...itemCommon,
    type: z.literal("REPLY_SELECT"),
    prompt: promptSchema,
    stimulus: z.optional(stimulusSchema),
    context: z.optional(textSchema),
    options: optionsSchema,
    feedback: z.optional(choiceFeedbackSchema),
  }),
  z.object({ ...stimulusChoice, type: z.literal("MIN_PAIR_AB") }),
  z.object({ ...stimulusChoice, type: z.literal("PARTICLE_FILL") }),
  z.object({ ...stimulusChoice, type: z.literal("PARTICLE_SWAP") }),
  z.object({
    ...itemCommon,
    type: z.literal("CULTURE_CHECK"),
    prompt: promptSchema,
    context: textSchema,
    options: optionsSchema,
    feedback: correctFeedbackSchema,
  }),
  z.object({
    ...itemCommon,
    type: z.literal("CULTURE_CARD"),
    context: textSchema,
    stimulus: stimulusSchema,
    feedback: correctFeedbackSchema,
  }),
  z.object({ ...tilesBuild, type: z.literal("LISTEN_BUILD") }),
  z.object({ ...tilesBuild, type: z.literal("SYLLABLE_BUILD") }),
  z.object({ ...speech, type: z.literal("SHADOW") }),
  z.object({ ...speech, type: z.literal("SPEAK_WORD") }),
  z.object({
    ...itemCommon,
    type: z.literal("HANGUL_WRITE"),
    prompt: promptSchema,
    context: textSchema,
    answers: z.array(textSchema).check(z.minLength(1)),
    feedback: z.optional(correctFeedbackSchema),
  }),
] as const;
