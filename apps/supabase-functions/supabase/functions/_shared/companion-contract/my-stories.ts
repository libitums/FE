// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// 내 스토리(단어 · 카드 · 사진)의 앱 RPC · Edge Function 모양입니다(ADR-0194 내 스토리 · ADR-0191).
// - `companion_my_stories(p_tz_offset_min?)` — 살아 있는 것 + 보관함 · 보관 설정 · 지금의 올리기 창.
// - `companion_post_my_story(…, p_tz_offset_min?)` — 올리기. 창마다 하나 · 24시간 안 세 개(서버 설정).
// - `companion_delete_my_story(p_story_id | null = 모두)` · `companion_set_keep_my_stories(p_keep)`.
// 친구의 반응은 그 인물 방의 채팅 메시지가 정본이고(`messageId`), 여기 `reactions`는 스토리 위 목록용으로 그 메시지를 모은 것입니다.
// - `POST /functions/v1/companion-my-story` — 사진 스토리: 교정(`draft`) · 올리기(`post`) · 글 고치기(`edit`). 맨 아래에 있습니다.
// - `companion_request_story_review(p_rejection_id)` — 거절된 사진의 「다시 확인 요청」.
// 요청 키는 Postgres 인자 이름 · snake_case, 응답은 camelCase입니다. 선택 칸만 더하므로 계약 판은 그대로입니다.
import { z } from "zod/mini";

/** 카탈로그 단어 카드의 참조입니다(단어장과 같은 키). */
export const myStoryWordSchema = z.object({ episodeId: z.string(), ref: z.string() });

export const myStoryKindSchema = z.enum(["word", "card", "photo"]);
/** `checking`: 사진 검수가 제때 끝나지 않아 다시 보는 중 — 올린 사람에게만 보이고 Seen · 반응이 아직 없습니다. */
export const myStoryStatusSchema = z.enum(["checking", "live"]);

/**
 * 사진 위에 얹은 단어 · 카드 하나입니다(굽지 않고 따로 저장 — 눌러 듣기). 위치 · 크기는 사진 너비 · 높이에 대한 비율(0 ~ 1),
 * `rotation`은 도입니다. `word`는 카탈로그 단어 카드 참조(단어장 단어 · 레슨 카드), 직접 쓴 글(`text`)이면 없습니다.
 */
/** 사진 한 장에 얹을 수 있는 단어 · 카드 수 — 서버(`my_stories.overlays`)의 제약과 같다. */
export const MY_STORY_OVERLAY_MAX = 8;
export const myStoryOverlaySchema = z.object({
  kind: z.enum(["word", "card", "text"]),
  ko: z.string(),
  roman: z.optional(z.string()),
  meaning: z.optional(z.string()),
  word: z.optional(myStoryWordSchema),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  rotation: z.number(),
});

/** 스토리 위 답 목록의 한 줄 — 인물 방에 저장된 반응 메시지의 말(`text`)과 번역(`meaning`, 없으면 null). */
export const myStoryReactionSchema = z.object({
  id: z.uuid(),
  characterId: z.string(),
  /** 그 인물 방의 메시지 id(ADR-0191 D2). 20261228140000 초안 서버는 칸이 없습니다. */
  messageId: z.optional(z.uuid()),
  text: z.string(),
  meaning: z.nullable(z.string()),
  at: z.iso.datetime({ offset: true }),
});

/** 「Seen by」의 한 줄 — 시각이 된 인물만 옵니다. 서버 스위치가 꺼져 있으면 빈 목록입니다. */
export const myStorySeenSchema = z.object({
  characterId: z.string(),
  at: z.iso.datetime({ offset: true }),
});

export const myStorySchema = z.object({
  id: z.uuid(),
  kind: myStoryKindSchema,
  /** 사진 스토리 서버(20270104130000)부터 옵니다. 없으면 live입니다. */
  status: z.optional(myStoryStatusSchema),
  /** 단어 · 카드 스토리의 단어입니다. 사진 스토리는 null입니다. */
  word: z.nullable(myStoryWordSchema),
  /** 단어 · 카드는 단어, 사진은 올린 사람이 붙인 한국어 한 줄입니다. */
  ko: z.string(),
  roman: z.string(),
  /** 올린 사람의 화면 언어 뜻입니다(사진은 빈 글일 수 있습니다). */
  meaning: z.string(),
  example: z.nullable(z.object({ ko: z.string(), meaning: z.nullable(z.string()) })),
  /** 비공개 버킷 `my-story-photos` 안의 경로 — 앱이 자기 토큰으로 서명 주소를 만듭니다. 사진 스토리만. */
  imagePath: z.optional(z.nullable(z.string())),
  overlays: z.optional(z.array(myStoryOverlaySchema).check(z.maxLength(MY_STORY_OVERLAY_MAX))),
  /** 교정 전 내가 쓴 글(「Use this」로 바꿨을 때만). */
  lineOriginal: z.optional(z.nullable(z.string())),
  /** 글을 고친 횟수(스토리당 상한은 서버 설정, 기본 3). */
  edits: z.optional(z.int()),
  postedAt: z.iso.datetime({ offset: true }),
  /** 친구에게 보이는 끝(올린 뒤 24시간). 보관함에는 지울 때까지 남습니다. */
  expiresAt: z.iso.datetime({ offset: true }),
  reactions: z.array(myStoryReactionSchema),
  seenBy: z.optional(z.array(myStorySeenSchema)),
});

/**
 * 지금의 올리기 창입니다(ADR-0191 D8) — 현지 아침 · 낮 · 밤 창마다 하나만 올릴 수 있습니다.
 * `used`가 참이면 이 창은 이미 썼고, `nextAt`에 다음 창이 열립니다. `day`는 창이 속한 현지 날(밤 창의 새벽은 전날)입니다.
 */
export const myStoryWindowSchema = z.object({
  slot: z.enum(["morning", "day", "night"]),
  day: z.string(),
  nextAt: z.iso.datetime({ offset: true }),
  used: z.boolean(),
});

/** `companion_my_stories` — `enabled`가 거짓이면(스위치 off · 시험 계정 아님) 「+」를 그리지 않습니다. */
export const myStoriesResponseSchema = z.object({
  enabled: z.boolean(),
  keep: z.boolean(),
  stories: z.array(myStorySchema),
  window: z.optional(z.nullable(myStoryWindowSchema)),
});

/** `companion_post_my_story`의 인자입니다. `p_tz_offset_min`은 기기의 UTC 차이(분) — 서버가 시간대를 모를 때만 씁니다. */
export const postMyStoryRequestSchema = z.object({
  p_client_id: z.uuid(),
  p_kind: myStoryKindSchema,
  p_word: myStoryWordSchema,
  p_ko: z.string(),
  p_roman: z.string(),
  p_meaning: z.string(),
  p_example_ko: z.nullable(z.string()),
  p_example_meaning: z.nullable(z.string()),
  p_lang: z.string(),
  p_tz_offset_min: z.optional(z.nullable(z.int())),
});

/**
 * `ok`만 `story`가 있습니다. `window_used`: 이 창은 이미 씀(`window.nextAt`에 다시) · `daily_limit`: 24시간 안 상한 ·
 * `off`: 스위치 꺼짐 · `invalid`: 값이 틀림. 모르는 새 결과가 와도 실패로 다룹니다.
 */
export const postMyStoryResultSchema = z.object({
  result: z.string(),
  story: z.nullable(myStorySchema),
  window: z.optional(z.nullable(myStoryWindowSchema)),
});

/**
 * `POST /functions/v1/companion-my-story`의 본문입니다(앱 JWT).
 * - `draft`: 올리기 전 교정 — 한국어든 모국어든 받아 자연스러운 한국어 한 줄을 돌려줍니다. 글 검수를 겸합니다.
 * - `post`: 사진 스토리 올리기. 앱이 먼저 `my-story-photos/<user_id>/<파일>`에 사진을 올린 뒤 그 경로를 보냅니다. 요청 안에서 사진을
 *   읽어(검수 · 장면 설명) 게시 · 거절 · `checking`(다시 보는 중)을 정합니다.
 * - `edit`: 올린 뒤 글만 고칩니다(사진은 못 바꿉니다).
 */
export const myStoryRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("draft"), text: z.string() }),
  z.object({
    action: z.literal("post"),
    client_id: z.uuid(),
    image_path: z.string(),
    ko: z.string(),
    roman: z.optional(z.string()),
    meaning: z.optional(z.string()),
    /** 교정 전 내가 쓴 글 — 「Use this」로 바꿨을 때만 보냅니다. */
    original: z.optional(z.string()),
    overlays: z.optional(z.array(myStoryOverlaySchema).check(z.maxLength(MY_STORY_OVERLAY_MAX))),
    lang: z.string(),
    tz_offset_min: z.optional(z.nullable(z.int())),
  }),
  z.object({
    action: z.literal("edit"),
    story_id: z.uuid(),
    ko: z.string(),
    roman: z.optional(z.string()),
    meaning: z.optional(z.string()),
  }),
]);

/** 교정 결과입니다. `kind`: same(그대로 좋음) · correction(고침) · better(더 자연스러운 말) · l1_to_ko(모국어를 한국어로). */
export const myStoryDraftSchema = z.object({
  kind: z.enum(["same", "correction", "better", "l1_to_ko"]),
  ko: z.string(),
  meaning: z.nullable(z.string()),
  /** 한 줄 설명(문법 팁). 없으면 null. */
  tip: z.nullable(z.string()),
});

/** 거절된 사진입니다. `id`로 `companion_request_story_review`(다시 확인 요청)를 부릅니다. */
export const myStoryRejectionSchema = z.object({
  id: z.uuid(),
  category: z.string(),
  purgeAfter: z.optional(z.iso.datetime({ offset: true })),
});

/**
 * `companion-my-story`의 응답입니다(HTTP 200). `result`:
 * - draft: `ok`(+ `draft`) · `text_blocked` · `crisis` · `draft_limit` · `off` · `unavailable`.
 * - post: `ok`(+ `story` — `status`가 checking일 수 있음) · `rejected`(+ `rejection`) · `text_blocked` · `window_used` · `daily_limit` ·
 *   `check_limit`(하루 검수 시도 상한) · `age`(성인만) · `off` · `no_photo`(경로에 사진이 없음) · `invalid`.
 * - edit: `ok`(+ `story`) · `text_blocked` · `edit_limit` · `draft_limit` · `not_found` · `invalid`.
 * 모르는 새 결과가 와도 실패로 다룹니다.
 */
export const myStoryResponseSchema = z.object({
  result: z.string(),
  story: z.optional(z.nullable(myStorySchema)),
  window: z.optional(z.nullable(myStoryWindowSchema)),
  rejection: z.optional(z.nullable(myStoryRejectionSchema)),
  draft: z.optional(z.nullable(myStoryDraftSchema)),
});

export type MyStory = z.infer<typeof myStorySchema>;
export type MyStoryOverlay = z.infer<typeof myStoryOverlaySchema>;
export type MyStoryRequest = z.infer<typeof myStoryRequestSchema>;
export type MyStoryDraft = z.infer<typeof myStoryDraftSchema>;
export type MyStoryResponse = z.infer<typeof myStoryResponseSchema>;
export type MyStoryReaction = z.infer<typeof myStoryReactionSchema>;
export type MyStoryWindow = z.infer<typeof myStoryWindowSchema>;
export type MyStoriesResponse = z.infer<typeof myStoriesResponseSchema>;
export type PostMyStoryRequest = z.infer<typeof postMyStoryRequestSchema>;
export type PostMyStoryResult = z.infer<typeof postMyStoryResultSchema>;
