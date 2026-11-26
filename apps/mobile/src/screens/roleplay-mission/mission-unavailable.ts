// 출처 · 기기 음성이 아직 없을 때(release 빌드 — 가짜는 dev 전용, 서버 출처 · 호스트 모듈은 아직 없음)의 빈 구현입니다.
// 스위치(`ROLEPLAY_MISSION_READY`)가 꺼져 있으면 부르지 않지만, 결선이 늘 포트 하나를 돌려주게 합니다 — 목록은 비고, 시작은
// `not_available`, 나머지는 실패로 조용히 끝납니다.

import type { MissionAudioDevice } from "./mission-voice.contract";
import type { MissionSource } from "./roleplay-mission.contract";

export const unavailableMissionSource: MissionSource = {
  list: () => Promise.resolve({ missions: [], price: { freeLeft: 0, cost: 0, balance: null } }),
  start: () => Promise.resolve({ kind: "rejected", code: "not_available" }),
  sendTurn: (_request, listener) => {
    listener.onEvent("error", JSON.stringify({ code: "not_available", retryable: false }));
    listener.onEnd();
    return () => undefined;
  },
  hint: () => Promise.resolve({ kind: "unavailable" }),
  finish: (conversationId) => Promise.resolve({ status: "abandoned", conversationId }),
  transcribe: () => Promise.resolve({ kind: "failed", error: "voice_not_configured" }),
  speak: () => Promise.resolve({ kind: "failed" }),
};

export const unavailableAudioDevice: MissionAudioDevice = {
  startRecording: () => Promise.resolve("unavailable"),
  stopRecording: () => Promise.resolve(null),
  cancelRecording: () => undefined,
  play: () => "unavailable",
  stopPlayback: () => undefined,
};
