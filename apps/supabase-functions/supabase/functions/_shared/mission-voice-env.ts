// 미션 음성(`mission-stt` · `mission-tts`)의 환경. 순수 함수입니다 — 환경 값은 읽는 함수로 받습니다.
//
// Supabase 세 값과 URL 규칙은 1단계 스냅샷 · 음성(`mediaEnvFrom`)을 그대로 쓰고, ElevenLabs 키도 같은 이름 `ELEVENLABS_API_KEY`입니다.
// 키가 없으면 env는 서되 요청이 503 `voice_not_configured`(값은 싣지 않는다). 모델 · 음성 · 바로 보내기 문턱은 미션 전용 값으로만 바꿉니다.
// 기본값은 대시보드 실험실(ops-dashboard `speech_vendors.py` · `companion_voice.py`)이 맥미니에서 진짜 호출로 검증한 값입니다(파이프라인 문서 §6.2).

import { mediaEnvFrom, type MediaEnvName } from "./companion-media-env.ts";
import { AUTOSEND_DEFAULTS, type AutoSendSettings } from "./mission-voice-autosend.ts";

export const missionSttModelEnv = "COMPANION_MISSION_STT_MODEL";
export const missionTtsModelEnv = "COMPANION_MISSION_TTS_MODEL";
export const missionTtsVoiceEnv = "COMPANION_MISSION_TTS_VOICE";
export const missionZeroRetentionEnv = "COMPANION_MISSION_STT_ZERO_RETENTION";
export const missionAutosendEnv = {
  confMin: "COMPANION_MISSION_AUTOSEND_CONF_MIN",
  confMean: "COMPANION_MISSION_AUTOSEND_CONF_MEAN",
  minSeconds: "COMPANION_MISSION_AUTOSEND_MIN_SECONDS",
  hangulMin: "COMPANION_MISSION_AUTOSEND_HANGUL_MIN",
  withoutConfidence: "COMPANION_MISSION_AUTOSEND_WITHOUT_CONFIDENCE",
} as const;

export const defaultMissionVoice = {
  /** ElevenLabs Scribe v3(scribe_v1은 지원 중단). */
  sttModel: "scribe_v3",
  /** 짧은 한국어 문장 첫 바이트 p50 0.24초(eleven_v3 0.8초) — §6.2. */
  ttsModel: "eleven_v4_turbo",
  /** 미션 파일에 `counterpart.voice`가 없을 때 — 실험실 기본값(편의점 점원). */
  voice: "l6fNdLYgoqjfTIPUeFc9",
} as const;

/** 합성 mp3의 서명 주소 유효 시간. 만료 뒤에는 같은 요청이 캐시 적중으로 새 주소를 준다. */
export const missionTtsSignSeconds = 3600;

export type MissionVoiceEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly elevenKey: string | null;
  readonly sttModel: string;
  readonly ttsModel: string;
  readonly defaultVoice: string;
  /**
   * Scribe 요청에 `enable_logging=false`(ElevenLabs 무보존 모드)를 싣는가. 기본 켬 — 합의 조건(음성을 남기지 않음)을 벤더 쪽에도 건다.
   * ElevenLabs 문서상 엔터프라이즈 계정 전용이라, 계정이 받지 않으면 `off`로 끈다(진짜 호출로 확인 전).
   */
  readonly zeroRetention: boolean;
  readonly autosend: AutoSendSettings;
};

type Name =
  | MediaEnvName
  | typeof missionSttModelEnv
  | typeof missionTtsModelEnv
  | typeof missionTtsVoiceEnv
  | typeof missionZeroRetentionEnv
  | (typeof missionAutosendEnv)[keyof typeof missionAutosendEnv];

const voiceShape = /^[A-Za-z0-9]{8,64}$/;

export function missionVoiceEnvFrom(
  read: (name: Name) => string | undefined,
): MissionVoiceEnv | null {
  const media = mediaEnvFrom(read);
  if (media === null) return null;
  const value = (name: Name): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  const ratio = (name: Name, fallback: number, max: number): number => {
    const n = Number(value(name) ?? Number.NaN);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : fallback;
  };
  const voice = value(missionTtsVoiceEnv);
  const without = value(missionAutosendEnv.withoutConfidence)?.toLowerCase();
  return {
    supabaseUrl: media.supabaseUrl,
    supabaseAnonKey: media.supabaseAnonKey,
    supabaseServiceRoleKey: media.supabaseServiceRoleKey,
    elevenKey: media.elevenKey,
    sttModel: value(missionSttModelEnv) ?? defaultMissionVoice.sttModel,
    ttsModel: value(missionTtsModelEnv) ?? defaultMissionVoice.ttsModel,
    defaultVoice: voice !== null && voiceShape.test(voice) ? voice : defaultMissionVoice.voice,
    zeroRetention: value(missionZeroRetentionEnv)?.toLowerCase() !== "off",
    autosend: {
      confMin: ratio(missionAutosendEnv.confMin, AUTOSEND_DEFAULTS.confMin, 1),
      confMean: ratio(missionAutosendEnv.confMean, AUTOSEND_DEFAULTS.confMean, 1),
      minSeconds: ratio(missionAutosendEnv.minSeconds, AUTOSEND_DEFAULTS.minSeconds, 5),
      hangulMin: ratio(missionAutosendEnv.hangulMin, AUTOSEND_DEFAULTS.hangulMin, 1),
      withoutConfidence:
        without === undefined ? AUTOSEND_DEFAULTS.withoutConfidence : without === "on",
    },
  };
}
