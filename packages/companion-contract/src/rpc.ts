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
import { snapshotSelfSchema } from "./media";
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
  /** 스냅샷에 그릴 학습자 뒷모습(20261128) — 기본 `female`, `hidden`이면 손 · 어깨만. 저장은 `companion_save_profile`의 `p_snapshot_self`. */
  snapshotSelf: snapshotSelfSchema,
  /**
   * 성인 확인 동의(20261216, ADR-0164) — 동의가 있고 지금 생년상 성인일 때만 참. 동의는 `companion_ack_adult()`. 생년이 성인이 아니게
   * 바뀌면 서버가 동의를 지운다. 완화 수위(open) 친구는 이것과 생년상 성인이 모두 있어야 완화 수위로 대화한다.
   * 선택 칸이다 — 마이그레이션(20261216) 전 서버와 이 칸을 모르는 옛 앱이 깨지지 않게(없으면 false로 읽는다).
   */
  adultAck: z.optional(z.boolean()),
});

/** 인물의 로맨스 수위(ADR-0164). `open`은 인물의 성격이고, 실제 적용은 서버가 학습자(생년상 성인 + 성인 확인 동의)로 정한다. */
export const romanceTierSchema = z.enum(["open", "standard"]);

/**
 * `companion_friends()`의 반환입니다(20261216). 이 학습자에게 보이는(대화할 수 있는) 추천 친구 id와 인물의 수위, 순서대로.
 * 출시 스위치(`settings.friends_mode`)가 off이거나 시험 계정 전용인데 시험 계정이 아니면 빈 목록. 생년으로 미성년자가 확인된 학습자에게는
 * `open` 친구가 없다. 친구를 추가하는 것은 무료 · 무제한이고, 추가한 상태는 앱(계정별 기기)이 쥔다.
 */
export const companionFriendsResponseSchema = z.object({
  friends: z.array(z.object({ id: z.string(), romanceTier: romanceTierSchema })),
});

/** `companion_ack_adult()`의 반환입니다(20261216). 생년상 성인일 때만 동의를 남기고 `ok`가 참. 나이 모름 · 미성년자는 거짓 · 거짓. */
export const companionAckAdultResponseSchema = z.object({
  ok: z.boolean(),
  adultAck: z.boolean(),
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
export const segmentSchema = z.object({
  kind: segmentKindSchema,
  text: z.string(),
  translation: z.optional(z.string()),
});

/** 👎 이유(PRD §3.15) — 한국어가 어색함 · 캐릭터답지 않음 · 너무 어려움 · 불편함 · 기타. */
export const ratingReasonSchema = z.enum([
  "awkward_korean",
  "out_of_character",
  "too_hard",
  "uncomfortable",
  "other",
]);

/**
 * 캐릭터 메시지에 유저가 남긴 평가입니다. 저장 · 바꾸기 · 지우기는 `companion_rate_message(p_message_id, p_rating, p_reasons,
 * p_note)` — `p_rating` `up` · `down` · null(지움), 이유 · 글(200자)은 `down`에만.
 */
export const messageRatingSchema = z.object({
  value: z.enum(["up", "down"]),
  reasons: z.array(ratingReasonSchema),
  note: z.nullable(z.string()),
});

/**
 * 메시지 목록의 한 줄입니다. `feedback`은 유저 메시지에 붙은 SSE `correction`의 본문과 같은 모양이고, 끊긴 스트림의
 * 피드백을 여기서 다시 받습니다. 사후 출력 검사에 걸리면 `hidden`이 참이고 `segments`는 비어 옵니다.
 */
export const companionMessageSchema = z.object({
  id: z.uuid(),
  role: z.enum(["user", "assistant", "notice"]),
  /** `greeting`은 대화가 비었을 때 캐릭터가 먼저 건 첫 인사(`companion-greet`)입니다. */
  /** `story_reaction`(20261228140000, ADR-0191 D2): 인물이 내 스토리에 단 반응 — `story` 인용이 함께 옵니다. */
  origin: z.enum(["turn", "proactive", "crisis", "greeting", "story_reaction"]),
  status: z.enum(["complete", "blocked", "crisis", "failed"]),
  hidden: z.boolean(),
  text: z.nullable(z.string()),
  inputMode: z.nullable(inputModeSchema),
  segments: z.array(segmentSchema),
  notice: z.nullable(z.object({ kind: noticeKindSchema })),
  feedback: z.nullable(correctionDataSchema),
  /** 캐릭터 메시지에 저장된 추천 답변 칩(SSE `suggestions` · `companion-suggest`와 같은 셋). 없으면 null, 옛 서버는 칸이 없습니다. */
  suggestions: z.optional(z.nullable(z.array(replySuggestionSchema))),
  /** 캐릭터 메시지의 👍/👎(20261124). 평가가 없거나 유저 메시지면 null, 옛 서버는 칸이 없습니다. 고쳐서 숨긴 턴은 목록에 오지 않습니다. */
  rating: z.optional(z.nullable(messageRatingSchema)),
  /**
   * 스토리 인용(20261228, ADR-0178 D5 · ADR-0179 · ADR-0191 D2). 유저 메시지가 `story_id`를 실어 보냈을 때와, 인물이 내 스토리에 단
   * 반응 메시지(origin `story_reaction` — `kind` mine, 스토리를 지우면 deleted)에만 있고 아니면 null. 옛 서버는 칸이 없습니다.
   * - 친구 스토리(`kind` friend — 20261228120000 서버는 칸이 없음): `imagePath`는 버킷 상대 경로(앱이 아바타와 같은 해석기로 주소를 만듭니다).
   * - 내 스토리(`kind` mine — 인물의 반응에 답함): `line`은 단어(한국어), 그림 없음.
   * - 지운 내 스토리(`kind` deleted): 인물만 — 앱은 「Deleted story」.
   */
  story: z.optional(
    z.nullable(
      z.union([
        z.object({
          kind: z.optional(z.literal("friend")),
          id: z.uuid(),
          characterId: z.string(),
          line: z.string(),
          imagePath: z.string(),
          postedAt: z.iso.datetime({ offset: true }),
        }),
        z.object({
          kind: z.literal("mine"),
          id: z.uuid(),
          characterId: z.string(),
          line: z.string(),
          imagePath: z.null(),
          postedAt: z.iso.datetime({ offset: true }),
        }),
        z.object({ kind: z.literal("deleted"), characterId: z.string() }),
      ]),
    ),
  ),
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

/** `companion_get_wallet()`의 반환입니다(M4). 버킷별 잔액과 체험 남은 수(20261216부터 모든 인물이 함께 쓰는 합산 수), 티어입니다. */
export const companionWalletSchema = z.object({
  tier: z.enum(["free", "premium"]),
  sub: z.int().check(z.nonnegative()),
  subExpiresAt: z.nullable(z.string()),
  grant: z.int().check(z.nonnegative()),
  paid: z.int().check(z.nonnegative()),
  trialRemaining: z.int().check(z.nonnegative()),
});

/** 고를 수 있는 에피소드 하나 — 유닛을 하나 이상 끝냈고 학습 표현이 있는 에피소드입니다. `title`이 없으면 앱이 id를 보입니다. */
export const learningScopeOptionSchema = z.object({
  episode: z.string(),
  title: z.nullable(z.string()),
  completedUnits: z.int().check(z.nonnegative()),
  expressions: z.int().check(z.nonnegative()),
  selected: z.boolean(),
});

/**
 * 배운 표현을 고를 범위입니다(20261126). 읽기 `companion_learning_scope()`, 바꾸기
 * `companion_set_learning_scope(p_scope, p_units)` — `p_units`를 null로 보내면 고른 목록은 그대로 두고 범위만 바꿉니다(최대 50개).
 * `auto`(기본)는 끝낸 유닛 전부, `manual`은 고른 에피소드의 끝낸 유닛만 씁니다. `units`는 고른 것 가운데 지금 고를 수 있는 것만이고,
 * `manual`인데 그것이 없으면 `empty`가 참 — 대화에 배운 표현을 넣지 않습니다(자동으로 되돌리지 않습니다).
 */
export const learningScopeSchema = z.object({
  scope: z.enum(["auto", "manual"]),
  units: z.array(z.string()),
  empty: z.boolean(),
  options: z.array(learningScopeOptionSchema),
});

export type FeedbackMode = z.infer<typeof feedbackModeSchema>;
export type CompanionMemory = z.infer<typeof companionMemorySchema>;
export type CompanionMemoryList = z.infer<typeof companionMemoryListSchema>;
export type CompanionWallet = z.infer<typeof companionWalletSchema>;
export type CompanionProfile = z.infer<typeof companionProfileSchema>;
export type RomanceTier = z.infer<typeof romanceTierSchema>;
export type CompanionFriendsResponse = z.infer<typeof companionFriendsResponseSchema>;
export type CompanionAckAdultResponse = z.infer<typeof companionAckAdultResponseSchema>;
export type ProactivePref = z.infer<typeof proactivePrefSchema>;
export type CompanionCharacter = z.infer<typeof companionCharacterSchema>;
export type RatingReason = z.infer<typeof ratingReasonSchema>;
export type MessageRating = z.infer<typeof messageRatingSchema>;
export type CompanionMessage = z.infer<typeof companionMessageSchema>;
export type CompanionMessagesPage = z.infer<typeof companionMessagesPageSchema>;
export type LearningScopeOption = z.infer<typeof learningScopeOptionSchema>;
export type LearningScope = z.infer<typeof learningScopeSchema>;
