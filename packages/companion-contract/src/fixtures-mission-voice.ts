// 롤플레이 미션 음성(`mission-stt` · `mission-tts`)의 재생용 값입니다. 6화 한 판(`fixtures-mission.ts`와 같은 판 id)의 받아 적기 ·
// 합성 성공과, 앱이 화면 갈래로 바꿔야 하는 실패(빈 결과 · 붐빔 · 벤더 실패 · 상한 · 너무 긴 녹음 · 남의 메시지)입니다.
import {
  MISSION_VOICE_ERRORS,
  type MissionSttResponse,
  type MissionTtsRequest,
  type MissionTtsResponse,
  type MissionVoiceErrorBody,
  type MissionVoiceErrorCode,
} from "./mission-voice";

const conversation = "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81";
const opening = "7d3e9a4c-6e3f-4b90-9c73-4f5a6b7c8d92";

/** 받아 적기 — 확신도가 높아 바로 보냄(`ok`)과, 낮아 입력 칸에서 확인(`low_confidence`). */
export const missionSttFixtures = {
  ok: {
    text: "아메리카노 한 잔 주세요.",
    autoSend: true,
    reason: "ok",
    words: [
      { text: "아메리카노", start: 0.12, end: 0.71, confidence: 0.981 },
      { text: "한", start: 0.78, end: 0.9, confidence: 0.962 },
      { text: "잔", start: 0.92, end: 1.05, confidence: 0.973 },
      { text: "주세요.", start: 1.1, end: 1.48, confidence: 0.99 },
    ],
    features: { confMin: 0.962, confMean: 0.9765, chars: 10, hangulRatio: 1, seconds: 1.6 },
    latencyMs: 627,
  },
  lowConfidence: {
    text: "아이스 라떼 하나 주세요.",
    autoSend: false,
    reason: "low_confidence",
    words: [
      { text: "아이스", start: 0.1, end: 0.45, confidence: 0.91 },
      { text: "라떼", start: 0.5, end: 0.8, confidence: 0.62 },
      { text: "하나", start: 0.85, end: 1.1, confidence: 0.94 },
      { text: "주세요.", start: 1.15, end: 1.5, confidence: 0.97 },
    ],
    features: { confMin: 0.62, confMean: 0.86, chars: 11, hangulRatio: 1, seconds: 1.7 },
    latencyMs: 702,
  },
} satisfies Record<string, MissionSttResponse>;

/** 합성 요청 — 진입 대사(메시지 id)와 힌트 예문(번호). */
export const missionTtsRequestFixtures = {
  opening: {
    contract_version: 1,
    conversation_id: conversation,
    kind: "message",
    message_id: opening,
  },
  hint: { contract_version: 1, conversation_id: conversation, kind: "hint", hint_no: 1 },
} satisfies Record<string, MissionTtsRequest>;

export const missionTtsFixture: MissionTtsResponse = {
  url: "https://ref.supabase.co/storage/v1/object/sign/companion-media/mission-tts/eleven_v4_turbo/rCm09Tf1yMYbOyCRLDyB/0f3c.mp3?token=fixture",
  expiresAt: "2026-11-23T10:00:00.000Z",
  cached: true,
  mime: "audio/mpeg",
};

export type MissionVoiceErrorFixture = { status: number; body: MissionVoiceErrorBody };

const errorOf = (
  error: MissionVoiceErrorCode,
  detail?: Record<string, unknown>,
): MissionVoiceErrorFixture => ({
  status: MISSION_VOICE_ERRORS[error].status,
  body: {
    error,
    retryable: MISSION_VOICE_ERRORS[error].retryable,
    ...(detail ? { detail } : {}),
  },
});

export const missionVoiceErrorFixtures = {
  "speech-empty": errorOf("speech_empty"),
  "speech-busy": errorOf("speech_busy"),
  "speech-unavailable": errorOf("speech_unavailable"),
  "audio-too-long": errorOf("audio_too_long", { seconds: 31.2, max: 30 }),
  "voice-limit": errorOf("voice_limit", { scope: "mission", limit: 30 }),
  "voice-target-not-found": errorOf("voice_target_not_found"),
  "tts-unavailable": errorOf("tts_unavailable"),
} satisfies Record<string, MissionVoiceErrorFixture>;
