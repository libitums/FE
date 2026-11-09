// 앱이 부르는 `public.companion_*` 창구 함수의 반환 모양입니다. 인수는 Postgres 함수 인수(`p_…`)라 여기 두지 않고,
// 반환 JSON만 계약으로 고정합니다. 키는 기존 `load_learner_profile`처럼 camelCase입니다.
import { z } from "zod/mini";

import { inputModeSchema } from "./chat-send";
import {
  correctionDataSchema,
  noticeKindSchema,
  segmentKindSchema,
  speechLevelSchema,
} from "./sse-events";
import { replySuggestionSchema } from "./suggest";

export const feedbackModeSchema = z.enum(["separate", "natural", "prefix"]);
export const ageSourceSchema = z.enum(["self", "social", "store_signal"]);
export const proactivePrefSchema = z.enum(["off", "daily1", "daily2"]);

/** `companion_load_profile()`의 반환입니다. 행이 없으면 함수가 `null`을 돌려줍니다. */
export const companionProfileSchema = z.object({
  birthYear: z.nullable(z.int()),
  ageSource: z.nullable(ageSourceSchema),
  l1: z.nullable(z.string()),
  /** 비어 있으면 서버 기본 `separate`(결정: separate, 2026-11-09 — PRD O5). */
  feedbackMode: z.nullable(feedbackModeSchema),
  /** 선톡 빈도 — 끔 · 하루 1회(기본) · 하루 2회. 저장은 `companion_save_profile`의 `p_proactive_pref`. */
  proactivePref: proactivePrefSchema,
  /** 선톡을 받고 싶은 현지 시각(0 ~ 23). null이면 아무 때나(조용한 시간 22 ~ 08시 제외). 지우기는 `p_proactive_hour = -1`. */
  proactiveHour: z.nullable(z.int().check(z.gte(0), z.lte(23))),
  /** IANA 시간대(예: `Asia/Manila`). null이면 지역의 대표 시간대, 그것도 없으면 시각 맞추기 · 조용한 시간을 건너뛴다. 지우기는 `p_timezone = ''`. */
  timezone: z.nullable(z.string()),
  /**
   * 추천 답변 칩 스위치. 기본 참. 켜져 있으면 `chat-send`가 캐릭터 답마다 칩을 만들어 SSE `suggestions`로 보낸다(탭 없이).
   * 꺼져 있으면 칩이 없다(`companion-suggest`도 `suggestions_off`). 저장은 `companion_save_profile`의 `p_reply_suggestions`.
   */
  replySuggestions: z.boolean(),
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
  /** 캐릭터 메시지에 저장된 추천 답변 칩(SSE `suggestions` · `companion-suggest`와 같은 셋). 없으면 null, 옛 서버는 칸이 없습니다. */
  suggestions: z.optional(z.nullable(z.array(replySuggestionSchema))),
  createdAt: z.iso.datetime({ offset: true }),
});

/** `companion_list_messages(…)`의 반환입니다. 최신이 앞입니다. */
export const companionMessagesPageSchema = z.object({
  messages: z.array(companionMessageSchema),
  hasMore: z.boolean(),
});

/**
 * `companion_list_memories(p_character_id)`의 기억 하나입니다(M3). `characterId`가 null이면 모든 캐릭터가 읽는 공유 기억입니다.
 * `userEdited`가 참이면 유저가 고친 기억이라 상한에 닿아도 저절로 지워지지 않습니다.
 */
export const companionMemorySchema = z.object({
  id: z.uuid(),
  characterId: z.nullable(z.string()),
  kind: z.enum(["fact", "event", "summary"]),
  content: z.string(),
  userEdited: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});

/**
 * `companion_list_memories(p_character_id)`의 반환입니다 — 한 층(캐릭터 · 공유)의 기억(최신이 앞)과 수 · 상한 · 가득 참.
 * 상한에 닿으면 서버가 유저가 고치지 않은 가장 오래된 기억부터 지우고, 모두 유저가 고친 것이면 새 기억을 넣지 못해 `full`이
 * 참입니다 — 앱이 「기억이 가득 찼어요 — 정리해 주세요」를 보입니다.
 */
export const companionMemoryListSchema = z.object({
  memories: z.array(companionMemorySchema),
  count: z.int().check(z.nonnegative()),
  cap: z.int().check(z.positive()),
  full: z.boolean(),
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
export type CompanionMemoryList = z.infer<typeof companionMemoryListSchema>;
export type CompanionWallet = z.infer<typeof companionWalletSchema>;
export type CompanionProfile = z.infer<typeof companionProfileSchema>;
export type ProactivePref = z.infer<typeof proactivePrefSchema>;
export type CompanionCharacter = z.infer<typeof companionCharacterSchema>;
export type CompanionMessage = z.infer<typeof companionMessageSchema>;
export type CompanionMessagesPage = z.infer<typeof companionMessagesPageSchema>;
