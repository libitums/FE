// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고
// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.
// 롤플레이 미션(ADR-0177)의 음성 두 창구 — `mission-stt`(받아 적기) · `mission-tts`(상대역 말 · 힌트 예문 합성)입니다.
// 벤더는 서버가 부르는 ElevenLabs(STT Scribe · TTS `eleven_v4_turbo`)이고, 앱은 키를 갖지 않습니다(파이프라인 문서 §6 · §10).
// 앱 화면 초안의 임시 타입(`mission-voice.contract.ts`의 `MissionTranscript` · `MissionSpeakRequest` · `MissionSpeech`)을 이 모양으로 바꿔 끼웁니다.
import { z } from "zod/mini";

import { preStreamErrorCodeSchema } from "./error-codes.ts";
import { MISSION_ERRORS, type MissionErrorCode } from "./mission.ts";

// ------------------------------------------------------------------ mission-stt

/** 녹음 형식 — 16kHz mono 16-bit PCM WAV. 서버는 변환하지 않고 머리만 검사합니다. */
export const MISSION_STT_SAMPLE_RATE = 16_000;
/** 녹음 길이 상한(초, §6.1 — 앱이 30초에서 저절로 멈춤). 넘으면 413 `audio_too_long`. */
export const MISSION_STT_MAX_SECONDS = 30;
/** 이보다 짧은 녹음은 벤더를 부르지 않고 422 `speech_empty`(앱은 0.4초 미만을 이미 버린다). */
export const MISSION_STT_MIN_SECONDS = 0.2;
/** 본문 크기 상한 — 30초 WAV(960,044 바이트)에 머리 조각 여유를 더한 1 MiB. */
export const MISSION_STT_MAX_BYTES = 1_048_576;
/** multipart 칸 이름. 글 칸은 `contract_version` · `conversation_id`, 파일 칸은 `audio`(`audio/wav`). */
export const MISSION_STT_AUDIO_FIELD = "audio";

/** multipart의 글 칸(`contract_version`은 글자로 와서 서버가 정수로 읽는다). */
export const missionSttFieldsSchema = z.object({
  contract_version: z.int(),
  conversation_id: z.uuid(),
});

/**
 * 받아 적은 글을 바로 보낼지의 까닭(대시보드 `autosend_decision`과 같은 이름). `ok`만 바로 보내고 나머지는 입력 칸에서 확인합니다.
 * `no_confidence`는 서버 설정을 따르므로 `autoSend`를 함께 봅니다. 빈 결과는 200이 아니라 422 `speech_empty`로 옵니다(`empty`는 남겨 둔 이름).
 */
export const missionAutoSendReasonSchema = z.enum([
  "ok",
  "low_confidence",
  "no_confidence",
  "too_short",
  "not_korean",
  "empty",
]);

/** 낱말 하나 — 시각(초)과 확신도(`exp(logprob)`, 벤더가 안 주면 null). */
export const missionSttWordSchema = z.object({
  text: z.string(),
  start: z.nullable(z.number()),
  end: z.nullable(z.number()),
  confidence: z.nullable(z.number().check(z.gte(0), z.lte(1))),
});

/** 판단 재료 — 낱말 확신도 최소 · 평균, 글자 수(공백 · 문장 부호 뺌), 한글 비율(글자 가운데), 녹음 길이(초). */
export const missionSttFeaturesSchema = z.object({
  confMin: z.nullable(z.number()),
  confMean: z.nullable(z.number()),
  chars: z.int().check(z.nonnegative()),
  hangulRatio: z.nullable(z.number()),
  seconds: z.number().check(z.nonnegative()),
});

export const missionSttResponseSchema = z.object({
  text: z.string().check(z.minLength(1)),
  autoSend: z.boolean(),
  reason: missionAutoSendReasonSchema,
  words: z.array(missionSttWordSchema),
  features: missionSttFeaturesSchema,
  /** 벤더 왕복 시간(ms) — 지연 예산 확인용. */
  latencyMs: z.int().check(z.nonnegative()),
});

// ------------------------------------------------------------------ mission-tts

/**
 * 무엇을 읽을지 — 서버가 DB에서 그 글을 꺼냅니다(앱이 보낸 글은 합성하지 않는다: 남용 · 비용 방지).
 * - `message`: 이 판의 상대역 메시지(진입 대사 `opening.messageId` 포함). 말 조각만 읽고 행동 지문은 읽지 않는다.
 * - `hint`: 이 판에서 받은 힌트 예문(`mission-hint` 응답의 `hintNo`).
 */
export const missionTtsRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    contract_version: z.int(),
    conversation_id: z.uuid(),
    kind: z.literal("message"),
    message_id: z.uuid(),
  }),
  z.object({
    contract_version: z.int(),
    conversation_id: z.uuid(),
    kind: z.literal("hint"),
    hint_no: z.int().check(z.gte(1), z.lte(20)),
  }),
]);

/** 합성 결과 — 서명된 mp3 주소(비공개 버킷 `companion-media`). 같은 (음성 · 모델 · 읽는 글)은 다시 만들지 않는다(`cached`). */
export const missionTtsResponseSchema = z.object({
  url: z.url(),
  /** 주소가 만료되는 때(ISO). 지나면 같은 요청을 다시 보내면 된다(캐시 적중 — 비용 없음). */
  expiresAt: z.iso.datetime({ offset: true }),
  cached: z.boolean(),
  mime: z.literal("audio/mpeg"),
});

// ------------------------------------------------------------------ 오류

/**
 * 음성 창구의 오류(1단계 · 미션 표에 더함). 본문은 `{ error, retryable, detail? }`.
 * - `invalid_audio`(400): WAV가 아니거나 16kHz mono 16-bit PCM이 아님. `audio_too_long`(413): 30초 · 1 MiB 초과.
 * - `speech_empty`(422): 너무 짧거나 받아 적은 글이 비었음. `speech_busy`(429): 벤더가 붐빔 — 몇 초 뒤 다시.
 * - `speech_unavailable`(503): 벤더 5xx · 시간 초과 · 연결 실패. `tts_unavailable`(503): 합성 · 저장 실패(조용히 — 글자만).
 * - `voice_limit`(429): 판 · 하루 상한(`detail.scope` = `mission` | `day`). `voice_target_not_found`(404): 그 판의 상대역 메시지 · 힌트가 아님.
 * - `voice_not_configured`(503): 서버에 ElevenLabs 키가 없음.
 */
export const MISSION_VOICE_ERRORS = {
  invalid_audio: { status: 400, retryable: false },
  audio_too_long: { status: 413, retryable: false },
  speech_empty: { status: 422, retryable: false },
  speech_busy: { status: 429, retryable: true },
  speech_unavailable: { status: 503, retryable: true },
  tts_unavailable: { status: 503, retryable: true },
  voice_limit: { status: 429, retryable: false },
  voice_target_not_found: { status: 404, retryable: false },
  voice_not_configured: { status: 503, retryable: false },
} as const;

export type MissionVoiceErrorCode = keyof typeof MISSION_VOICE_ERRORS;

const voiceCodes = Object.keys(MISSION_VOICE_ERRORS) as [
  MissionVoiceErrorCode,
  ...MissionVoiceErrorCode[],
];
const missionCodes = Object.keys(MISSION_ERRORS) as [MissionErrorCode, ...MissionErrorCode[]];

export const missionVoiceErrorBodySchema = z.object({
  error: z.union([preStreamErrorCodeSchema, z.enum(missionCodes), z.enum(voiceCodes)]),
  retryable: z.boolean(),
  detail: z.optional(z.record(z.string(), z.unknown())),
});

/**
 * 받아 적기 실패를 앱 화면의 세 갈래(§6.5 문구 표)로 — `empty`(다시 말하기 · 글자 입력) · `busy`(잠시 뒤) · `server`(다시 · 글자 입력).
 * 상한(`voice_limit`)은 `busy`로 보인다. 나머지(검사 실패 · 닫힌 판 · 인증)도 화면에서는 `server`다.
 */
export function missionSttFailure(error: string): "empty" | "busy" | "server" {
  if (error === "speech_empty") return "empty";
  if (error === "speech_busy" || error === "voice_limit") return "busy";
  return "server";
}

export type MissionSttFields = z.infer<typeof missionSttFieldsSchema>;
export type MissionAutoSendReason = z.infer<typeof missionAutoSendReasonSchema>;
export type MissionSttWord = z.infer<typeof missionSttWordSchema>;
export type MissionSttFeatures = z.infer<typeof missionSttFeaturesSchema>;
export type MissionSttResponse = z.infer<typeof missionSttResponseSchema>;
export type MissionTtsRequest = z.infer<typeof missionTtsRequestSchema>;
export type MissionTtsResponse = z.infer<typeof missionTtsResponseSchema>;
export type MissionVoiceErrorBody = z.infer<typeof missionVoiceErrorBodySchema>;
