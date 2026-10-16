import "background-only";

// 2026-10-15에 더한 문항 11종의 와이어 스키마입니다. 백그라운드 전용입니다.
import { z } from "zod/mini";
import {
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
    feedback: correctFeedbackSchema,
  }),
  z.object({ ...stimulusChoice, type: z.literal("REPLY_SELECT") }),
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
] as const;
