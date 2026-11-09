// `chat-send` 스트림의 이벤트 아홉 종입니다. 한 이벤트는 SSE의 `event` 이름 · `id`(턴 안 0부터) · `data`(JSON)입니다.
// 친밀도 수치는 어느 이벤트에도 싣지 않습니다 — 유저에게 보이는 관계 결과는 말투 단계뿐입니다.
import { z } from "zod/mini";

import { streamErrorCodeSchema } from "./error-codes";

export const speechLevelSchema = z.enum(["polite", "casual", "slang"]);
export const segmentKindSchema = z.enum(["speech", "action", "narration"]);
export const noticeKindSchema = z.enum(["ai_disclosure", "minor_notice", "break_reminder"]);

const nonNegativeInt = z.int().check(z.nonnegative());

export const startDataSchema = z.object({
  contractVersion: z.int(),
  conversationId: z.uuid(),
  userMessageId: z.uuid(),
  assistantMessageId: z.uuid(),
  speechLevel: speechLevelSchema,
});

export const noticeDataSchema = z.object({ kind: noticeKindSchema });

export const deltaDataSchema = z.object({
  segment: nonNegativeInt,
  kind: segmentKindSchema,
  text: z.string(),
});

const correctionItemSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  reason: z.string(),
});

export const feedbackKindSchema = z.enum(["correction", "better", "l1_to_ko"]);

/**
 * 유저 메시지 하나의 피드백 카드입니다. 칸은 늘 모두 있고(없는 값은 null · 빈 배열), 앱은 고정 이름표로 그립니다 —
 * 고친 문장(`corrected`) / 이유(`items[].reason`) / 더 나은 표현(`better`) / 뜻(`meaning`).
 * - `kind`: `correction`(틀린 곳을 고침) · `better`(맞지만 더 자연스럽게 — 비속어를 순화한 것 포함) · `l1_to_ko`(다른 언어가 섞인 말을
 *   자연스러운 한국어로). `status`가 `ok`가 아니면 null.
 * - `original`: 학습자가 보낸 메시지 그대로.
 * - `corrected`: 고친 · 자연스러운 한국어 문장 전체. `ok`면 늘 있다(`better`는 더 나은 문장 전체).
 * - `items`: 조각 단위 고침과 이유(학습자 언어로 한 문장). `l1_to_ko`면 비어 있다.
 * - `better`: 덧붙이는 다른 자연스러운 표현 — 분명히 도움이 될 때만.
 * - `meaning`: `corrected`의 뜻(학습자 언어). `l1_to_ko`면 늘 있다.
 * `none`(고칠 것 없음)과 `unavailable`(생성 실패 · 시간 초과)도 한 번 와서, 받는 쪽이 기다림을 끝낼 수 있게 합니다.
 * 2026-11-09 이전 판(kind마다 다른 모양 · `l1ToKo`)은 앱이 피드백을 쓰기 전이라 같은 계약 판(1)에서 바꿨습니다.
 */
export const correctionDataSchema = z.object({
  userMessageId: z.uuid(),
  status: z.enum(["ok", "none", "unavailable"]),
  kind: z.nullable(feedbackKindSchema),
  original: z.string(),
  corrected: z.nullable(z.string()),
  items: z.array(correctionItemSchema),
  better: z.nullable(z.object({ text: z.string(), explanation: z.string() })),
  meaning: z.nullable(z.string()),
});

export const translationDataSchema = z.object({ segment: nonNegativeInt, text: z.string() });

export const stateDataSchema = z.object({
  speechLevel: speechLevelSchema,
  speechLevelChanged: z.boolean(),
});

export const crisisResourceSchema = z.object({
  name: z.string(),
  phone: z.optional(z.string()),
  url: z.optional(z.string()),
  hours: z.optional(z.string()),
});

export const crisisDataSchema = z.object({
  resources: z.array(crisisResourceSchema),
  region: z.nullable(z.string()),
});

export const errorDataSchema = z.object({
  code: streamErrorCodeSchema,
  retryable: z.boolean(),
});

/** `balance`는 크레딧이 없는 동안(M4 전) `null`입니다. */
export const doneDataSchema = z.object({
  assistantMessageId: z.uuid(),
  creditsSpent: nonNegativeInt,
  balance: z.nullable(nonNegativeInt),
});

const eventOf = <Name extends string, Data extends z.ZodMiniType>(event: Name, data: Data) =>
  z.object({ event: z.literal(event), id: nonNegativeInt, data });

export const turnEventSchema = z.discriminatedUnion("event", [
  eventOf("start", startDataSchema),
  eventOf("notice", noticeDataSchema),
  eventOf("delta", deltaDataSchema),
  eventOf("correction", correctionDataSchema),
  eventOf("translation", translationDataSchema),
  eventOf("state", stateDataSchema),
  eventOf("crisis", crisisDataSchema),
  eventOf("error", errorDataSchema),
  eventOf("done", doneDataSchema),
]);

export type TurnEvent = z.infer<typeof turnEventSchema>;
export type TurnEventName = TurnEvent["event"];
export type SpeechLevel = z.infer<typeof speechLevelSchema>;
export type SegmentKind = z.infer<typeof segmentKindSchema>;
export type NoticeKind = z.infer<typeof noticeKindSchema>;
