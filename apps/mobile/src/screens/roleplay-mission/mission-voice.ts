// 미션 음성의 순수 규칙입니다(파이프라인 문서 §6.1 · §6.5) — 녹음 · 받아 적기 · 재생 상태와, 받아 적은 글을 바로 보낼지의 판단.
// UI를 import하지 않습니다. 변화가 없으면 같은 참조를 돌려줍니다.

import type {
  MissionTranscript,
  MissionVoiceAction,
  MissionVoiceNotice,
  MissionVoiceState,
} from "./mission-voice.contract";

/** 이보다 짧은 녹음은 올리지 않습니다(잘못 누름 — 서버 하한 0.2초보다 넉넉히). */
export const MISSION_MIN_RECORD_SECONDS = 0.4;
/** 녹음 상한 — 호스트가 저절로 멈춥니다. */
export const MISSION_MAX_RECORD_SECONDS = 30;

export const initialMissionVoice: MissionVoiceState = {
  rec: "idle",
  seconds: 0,
  level: 0,
  notice: null,
  check: null,
  playback: { key: null, status: "idle" },
};

export function missionVoiceReducer(
  state: MissionVoiceState,
  action: MissionVoiceAction,
): MissionVoiceState {
  switch (action.type) {
    case "record-started":
      return { ...state, rec: "recording", seconds: 0, level: 0, notice: null, check: null };
    case "record-tick":
      return state.rec === "recording"
        ? { ...state, seconds: action.seconds, level: action.level }
        : state;
    case "record-stopped":
      return state.rec === "recording"
        ? { ...state, rec: "transcribing", notice: action.limit ? "maxLength" : null }
        : state;
    case "record-failed":
      return { ...state, rec: "idle", seconds: 0, level: 0, notice: action.notice };
    case "record-cancelled":
      return state.rec === "idle" ? state : { ...state, rec: "idle", seconds: 0, level: 0 };
    case "transcribed":
      return {
        ...state,
        rec: "idle",
        seconds: 0,
        level: 0,
        notice: state.notice === "maxLength" ? "maxLength" : null,
        check: action.check,
      };
    case "check-cleared":
      return state.check === null && state.notice === null
        ? state
        : { ...state, check: null, notice: null };
    case "play-loading":
      return { ...state, playback: { key: action.key, status: "loading" } };
    case "play-started":
      return state.playback.key === action.key
        ? { ...state, playback: { key: action.key, status: "playing" } }
        : state;
    case "play-ended":
      return state.playback.key === action.key
        ? { ...state, playback: { key: null, status: "idle" } }
        : state;
    case "play-stopped":
      return state.playback.key === null
        ? state
        : { ...state, playback: { key: null, status: "idle" } };
  }
}

/** 받아 적은 글을 어떻게 할지 — 바로 보냄(서버가 `autoSend`), 입력 칸에서 확인, 또는 실패 안내. */
export type TranscriptDecision =
  | { readonly kind: "send"; readonly text: string }
  | { readonly kind: "confirm"; readonly text: string; readonly check: "heard" | "notKorean" }
  | { readonly kind: "notice"; readonly notice: MissionVoiceNotice };

export function transcriptDecision(transcript: MissionTranscript): TranscriptDecision {
  if (transcript.kind === "failed") {
    return {
      kind: "notice",
      notice:
        transcript.code === "busy"
          ? "busy"
          : transcript.code === "empty"
            ? "notHeard"
            : "serverDown",
    };
  }
  const text = transcript.text.trim();
  if (text === "" || transcript.reason === "empty") return { kind: "notice", notice: "notHeard" };
  if (transcript.autoSend && transcript.reason !== "not_korean") return { kind: "send", text };
  return {
    kind: "confirm",
    text,
    check: transcript.reason === "not_korean" ? "notKorean" : "heard",
  };
}

/** 녹음 시간 표시(「0:07」). */
export function recordClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, "0")}`;
}
