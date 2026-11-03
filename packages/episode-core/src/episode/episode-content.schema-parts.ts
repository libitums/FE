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

/** 대답 고르기의 해설 — 맞힘 줄과, 있으면 틀림 줄 · 틀린 보기 id. */
export const choiceFeedbackSchema = z.object({
  correct: z.object({ ko: z.string(), en: optionalString }),
  wrong: z.optional(z.object({ ko: z.string(), en: optionalString })),
  wrong_option: optionalString,
});

// 이야기 문항(level-3 S8)의 장면입니다 — 앞 상대 줄들(`lead`) 뒤에 내가 할 줄(`line`)이 옵니다. 대화 줄 id(`line_id`)는
// `dialogue`의 줄을 가리킵니다.
const storyLeadSchema = z.object({
  speaker: z.string(),
  line: textSchema,
  audio_url: optionalString,
});
export const storySchema = z.object({
  line_id: z.string(),
  hint_after_miss: z.optional(z.boolean()),
  lead: z.array(storyLeadSchema),
  line: textSchema,
  situation: z.optional(textSchema),
  image_url: optionalString,
});

export const itemCommon = {
  id: z.string(),
  mode: z.string(),
  event: z.enum(["E", "R", "D"]),
  ref: optionalString,
  level: optionalInt,
  skill: optionalString,
  skill_level: optionalInt,
  story: z.optional(storySchema),
};

// 막간(INT) 이야기의 와이어입니다(ADR-0088). 형식(`form`)과 컷 종류(`cut_kind`)는 콘텐츠가 늘려 가므로 문자열로
// 받고, 모르는 종류는 정규화가 line · narration으로 그립니다. 스텝 스키마는 이 값을 `unknown`으로만 받습니다.
const interludeCutSchema = z.object({
  index: z.int(),
  cut_kind: z.string(),
  speaker: optionalString,
  with: optionalString,
  line: z.optional(textSchema),
  narration: z.optional(textSchema),
  aside: z.optional(textSchema),
  options: z.optional(z.array(textSchema)),
  after_option: optionalInt,
  background_voice: z.optional(z.boolean()),
  voice_label: optionalString,
  image_brief: optionalString,
  image_url: optionalString,
  background_url: optionalString,
  audio_url: optionalString,
});

const interludeSchema = z.object({
  form: z.string(),
  anchor: optionalString,
  caption: z.optional(textSchema),
  background_url: optionalString,
  // 인물 그림 표 `[{ speaker, image_url }]` — 틀린 항목이 막간을 버리지 않도록 모양은 해석 쪽이 가립니다.
  profiles: z.optional(z.unknown()),
  cuts: z.array(interludeCutSchema),
});

export type DeliveryInterlude = z.infer<typeof interludeSchema>;
export type DeliveryInterludeCut = z.infer<typeof interludeCutSchema>;

/** 막간 와이어를 검사합니다. 모양이 틀리면 `null`이고 던지지 않습니다. */
export function interludeWireOf(raw: unknown): DeliveryInterlude | null {
  const parsed = interludeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
