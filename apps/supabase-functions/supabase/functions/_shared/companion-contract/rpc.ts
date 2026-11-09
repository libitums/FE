// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// 앱이 부르는 `public.companion_*` 창구 함수의 반환 모양입니다. 인수는 Postgres 함수 인수(`p_…`)라 여기 두지 않고,
// 반환 JSON만 계약으로 고정합니다. 키는 기존 `load_learner_profile`처럼 camelCase입니다.
import { z } from "zod/mini";

import { inputModeSchema } from "./chat-send.ts";
import {
  correctionDataSchema,
  noticeKindSchema,
  segmentKindSchema,
  speechLevelSchema,
} from "./sse-events.ts";

export const feedbackModeSchema = z.enum(["separate", "natural", "prefix"]);
export const ageSourceSchema = z.enum(["self", "social", "store_signal"]);

/** `companion_load_profile()`의 반환입니다. 행이 없으면 함수가 `null`을 돌려줍니다. */
export const companionProfileSchema = z.object({
  birthYear: z.nullable(z.int()),
  ageSource: z.nullable(ageSourceSchema),
  l1: z.nullable(z.string()),
  feedbackMode: z.nullable(feedbackModeSchema),
});

export const characterAvailabilitySchema = z.enum([
  "trial_exhausted",
  "not_available",
  "age_restricted",
]);

/** `companion_list_characters()`의 원소입니다. 친밀도 수치는 없습니다. */
export const companionCharacterSchema = z.object({
  id: z.string(),
  available: z.boolean(),
  unavailableReason: z.nullable(characterAvailabilitySchema),
  speechLevel: speechLevelSchema,
  lastMessageAt: z.nullable(z.iso.datetime({ offset: true })),
});

/** 말풍선 하나. `translation`은 학습자 언어(L1) 번역 한 줄 — 번역이 꺼졌거나 실패했으면 없습니다(SSE `translation`과 같은 글). */
const segmentSchema = z.object({
  kind: segmentKindSchema,
  text: z.string(),
  translation: z.optional(z.string()),
});

/**
 * 메시지 목록의 한 줄입니다. `feedback`은 유저 메시지에 붙은 SSE `correction`의 본문과 같은 모양이고, 끊긴 스트림의
 * 피드백을 여기서 다시 받습니다. 사후 출력 검사에 걸리면 `hidden`이 참이고 `segments`는 비어 옵니다.
 */
export const companionMessageSchema = z.object({
  id: z.uuid(),
  role: z.enum(["user", "assistant", "notice"]),
  origin: z.enum(["turn", "proactive", "crisis"]),
  status: z.enum(["complete", "blocked", "crisis", "failed"]),
  hidden: z.boolean(),
  text: z.nullable(z.string()),
  inputMode: z.nullable(inputModeSchema),
  segments: z.array(segmentSchema),
  notice: z.nullable(z.object({ kind: noticeKindSchema })),
  feedback: z.nullable(correctionDataSchema),
  createdAt: z.iso.datetime({ offset: true }),
});

/** `companion_list_messages(…)`의 반환입니다. 최신이 앞입니다. */
export const companionMessagesPageSchema = z.object({
  messages: z.array(companionMessageSchema),
  hasMore: z.boolean(),
});

/** `companion_list_memories(p_character_id)`의 원소입니다(M3). `characterId`가 null이면 모든 캐릭터가 읽는 공유 기억입니다. */
export const companionMemorySchema = z.object({
  id: z.uuid(),
  characterId: z.nullable(z.string()),
  kind: z.enum(["fact", "event", "summary"]),
  content: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});

/** `companion_get_wallet()`의 반환입니다(M4). 버킷별 잔액과 덕수쌤 체험 남은 수, 티어입니다. */
export const companionWalletSchema = z.object({
  tier: z.enum(["free", "premium"]),
  sub: z.int().check(z.nonnegative()),
  subExpiresAt: z.nullable(z.string()),
  grant: z.int().check(z.nonnegative()),
  paid: z.int().check(z.nonnegative()),
  trialRemaining: z.int().check(z.nonnegative()),
});

export type FeedbackMode = z.infer<typeof feedbackModeSchema>;
export type CompanionMemory = z.infer<typeof companionMemorySchema>;
export type CompanionWallet = z.infer<typeof companionWalletSchema>;
export type CompanionProfile = z.infer<typeof companionProfileSchema>;
export type CompanionCharacter = z.infer<typeof companionCharacterSchema>;
export type CompanionMessage = z.infer<typeof companionMessageSchema>;
export type CompanionMessagesPage = z.infer<typeof companionMessagesPageSchema>;
