// delivery-2 와이어 스키마의 공통 조각입니다(텍스트 · 보기 · 자극 · 문항 공통 키).
import { z } from "zod/mini";

export const optionalString = z.optional(z.string());
export const optionalInt = z.optional(z.int());

export const textSchema = z.object({ ko: z.string(), roman: z.string(), en: optionalString });
export const promptSchema = z.object({ ko: z.string(), en: z.string() });

export const optionSchema = z.object({
  id: z.string(),
  ko: z.string(),
  roman: z.string(),
  en: optionalString,
  correct: z.boolean(),
  why_wrong: optionalString,
});

export const optionsSchema = z.array(optionSchema).check(
  z.refine((options) => options.filter((option) => option.correct).length === 1, {
    message: "option-correct-count",
  }),
);

export const stimulusSchema = z.object({
  audio: z.optional(textSchema),
  text: z.optional(textSchema),
  image_brief: optionalString,
  audio_url: optionalString,
  image_url: optionalString,
  en: optionalString,
});

export const correctFeedbackSchema = z.object({
  correct: z.object({ ko: z.string(), en: optionalString }),
});

export const itemCommon = {
  id: z.string(),
  mode: z.string(),
  event: z.enum(["E", "R", "D"]),
  ref: optionalString,
  level: optionalInt,
  skill: optionalString,
  skill_level: optionalInt,
};
