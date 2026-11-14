// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// 스냅샷 · 음성의 요청 · 응답 · 앨범 모양입니다(ADR-0146).
// - `POST /functions/v1/companion-snapshot` — 캐릭터 메시지 한 장면 → 이미지 한 장.
// - `POST /functions/v1/companion-voice` — 캐릭터 메시지의 한국어 대사 → mp3 한 개.
// 둘 다 바로 pending 행을 돌려주고(202) 백그라운드에서 만듭니다. 앱은 자리표시자를 보이고 `companion_get_media`로 상태를 다시 읽습니다.
// 결과 파일은 비공개 버킷 `companion-media`의 `path`에 있고, 앱이 자기 토큰으로 서명 URL을 만듭니다(Storage `object/sign`).
// 요청 키는 `chat-send`처럼 snake_case, 응답은 camelCase입니다.
import { z } from "zod/mini";

/**
 * 앱은 JWT와 `message_id`만 보냅니다(캐릭터는 서버가 메시지에서 읽습니다). `again`이 참이면 저장본을 두고 새로 만듭니다 — 스냅샷은
 * 「다시 그리기」(앞 그림이 있으면 `photo_redraw_cost`, 없으면 `photo_cost`), 음성은 「다시」(`voice_cost`). `user_id`는 서버 키로 부르는
 * ops-dashboard 플레이그라운드용이고, 앱 토큰으로 보내면 거절됩니다.
 */
export const companionMediaRequestSchema = z.object({
  message_id: z.uuid(),
  again: z.optional(z.boolean()),
  user_id: z.optional(z.uuid()),
});

export const mediaKindSchema = z.enum(["snapshot", "voice"]);
export const mediaStatusSchema = z.enum(["pending", "complete", "blocked", "failed"]);
/** 엽전 사유와 단가 키: `photo` → `photo_cost`(35), `photo_redraw` → `photo_redraw_cost`(25), `voice` → `voice_cost`(15). */
export const mediaChargeSchema = z.enum(["photo", "photo_redraw", "voice"]);

/**
 * blocked · failed의 까닭입니다. blocked: `prompt_blocked`(프롬프트 노드의 안전 판단) · `engine_refused`(엔진이 거절) ·
 * `check_failed`(완성 이미지 검사 탈락). failed: `engine_failed`(엔진 오류, 한 번 다시 한 뒤) · `prompt_failed` · `check_error`(검사 노드 호출 실패) ·
 * `refs_missing`(기준 이미지를 못 읽음) · `storage_failed` · `expired`(제한 시간 안에 끝나지 않음). 모르는 새 코드가 와도 실패로 다룹니다.
 */
export const mediaFailureSchema = z.string();

/** 스냅샷에 그릴 학습자 뒷모습. `hidden`이면 손 · 어깨만. 기본 `female`. 저장은 `companion_save_profile`의 `p_snapshot_self`. */
export const snapshotSelfSchema = z.enum(["female", "male", "hidden"]);

/** 결과 한 건(`companion.media_json`). */
export const companionMediaSchema = z.object({
  id: z.uuid(),
  characterId: z.string(),
  messageId: z.uuid(),
  kind: mediaKindSchema,
  status: mediaStatusSchema,
  charge: mediaChargeSchema,
  /** 낸(또는 예약한) 엽전. blocked · failed면 0 — 예약을 풀었습니다. */
  cost: z.int().check(z.gte(0)),
  /** `companion-media` 버킷 안 경로(`<user_id>/<id>.png|mp3`). complete일 때만. */
  path: z.nullable(z.string()),
  mime: z.nullable(z.string()),
  /** 스냅샷 비율. 음성 · 아직 모름이면 null. */
  aspect: z.nullable(z.enum(["3:2", "1:1"])),
  failure: z.nullable(mediaFailureSchema),
  /** 「AI 생성」 표시 — 늘 참. */
  aiGenerated: z.boolean(),
  engine: z.nullable(z.string()),
  model: z.nullable(z.string()),
  createdAt: z.string(),
  finishedAt: z.nullable(z.string()),
});

/**
 * 성공 응답. 새로 만들기 시작했으면 HTTP 202 · `cached: false`(엽전 예약됨, `status: pending`). 이 메시지의 저장본이나 만드는 중인 것을
 * 그대로 돌려주면 HTTP 200 · `cached: true`(차감 없음).
 */
export const companionMediaResponseSchema = z.object({
  media: companionMediaSchema,
  cached: z.boolean(),
});

/** 오류 코드와 HTTP 상태입니다. 본문은 `{ error, detail? }`. */
export const MEDIA_ERRORS = {
  method_not_allowed: 405,
  invalid_request: 400,
  invalid_session: 401,
  /** 남의 대화 메시지. */
  forbidden: 403,
  not_available: 403,
  age_restricted: 403,
  temporarily_blocked: 403,
  usage_time_limit: 403,
  message_not_found: 404,
  /** 통과한 캐릭터 메시지가 아님(유저 메시지 · 숨김 · 거절 · 위기 · 미완료). */
  not_eligible: 422,
  /** 음성: 소리 낼 한국어 대사가 없음. */
  no_speech: 422,
  /** 음성: 대사가 600자를 넘음. */
  too_long: 422,
  insufficient_credits: 402,
  /** 스냅샷은 유저당 동시에 하나 — `detail.mediaId`가 만드는 중인 것. */
  snapshot_in_progress: 409,
  /** 스냅샷 하루 상한(UTC 날짜) — `detail.limit`. */
  daily_limit: 429,
  server_misconfigured: 500,
  internal_error: 500,
  /** 엔진 키(`OPENAI_API_KEY` · `ELEVENLABS_API_KEY` · `ANTHROPIC_API_KEY`) · 캐릭터 voice id · 기준 이미지가 없음 — `detail.missing`. */
  not_configured: 503,
} as const;

export type MediaErrorCode = keyof typeof MEDIA_ERRORS;
const mediaErrorCodes = Object.keys(MEDIA_ERRORS) as [MediaErrorCode, ...MediaErrorCode[]];
export const mediaErrorCodeSchema = z.enum(mediaErrorCodes);
export const companionMediaErrorSchema = z.object({
  error: mediaErrorCodeSchema,
  detail: z.optional(z.record(z.string(), z.unknown())),
});

/** 앨범 한 쪽(`companion_list_media`) — 다 만든 것만, 최신부터. */
export const companionMediaPageSchema = z.object({
  items: z.array(companionMediaSchema),
  hasMore: z.boolean(),
});

export type CompanionMediaRequest = z.infer<typeof companionMediaRequestSchema>;
export type CompanionMedia = z.infer<typeof companionMediaSchema>;
export type CompanionMediaResponse = z.infer<typeof companionMediaResponseSchema>;
export type CompanionMediaError = z.infer<typeof companionMediaErrorSchema>;
export type CompanionMediaPage = z.infer<typeof companionMediaPageSchema>;
export type MediaKind = z.infer<typeof mediaKindSchema>;
export type MediaStatus = z.infer<typeof mediaStatusSchema>;
export type MediaCharge = z.infer<typeof mediaChargeSchema>;
export type SnapshotSelf = z.infer<typeof snapshotSelfSchema>;
