// 기기 음성 포트(`MissionAudioDevice`)의 가짜 — 호스트 녹음 · 재생 모듈이 생기기 전까지 개발 미리보기 · 테스트에서 끝까지 돌게 합니다.
// 녹음은 눈금 하나를 보내고 멈추면 정한 길이의 가짜 파일을, 재생은 한 걸음 뒤 끝났다고 알립니다. 테스트는 가지를 고릅니다.

import type { MissionAudioClip, MissionAudioDevice } from "./mission-voice.contract";

export type FakeAudioOptions = {
  /** 녹음 시작의 결과 — 권한 거부 · 모듈 없음 가지. */
  readonly mic?: "ok" | "denied" | "unavailable";
  /** 멈춘 녹음의 길이(초). 0.4 미만이면 화면이 「짧음」으로 버립니다. */
  readonly seconds?: number;
  /** 재생 — 모듈 없음 가지. */
  readonly playback?: "ok" | "unavailable";
  readonly schedule?: (task: () => void) => void;
};

export type FakeAudioDevice = MissionAudioDevice & {
  /** 재생을 부른 주소 차례(테스트가 봅니다). */
  readonly played: readonly string[];
  readonly stops: () => number;
  readonly recording: () => boolean;
  /** 30초 상한에 닿은 것처럼 호스트 쪽 멈춤을 알립니다. */
  readonly hitLimit: () => void;
};

const FAKE_PLAY_MS = 1200;
const defaultSchedule = (task: () => void): void => {
  setTimeout(task, FAKE_PLAY_MS);
};

export function createFakeAudioDevice(options: FakeAudioOptions = {}): FakeAudioDevice {
  const schedule = options.schedule ?? defaultSchedule;
  const played: string[] = [];
  let recording = false;
  let clips = 0;
  let stops = 0;
  let playToken = 0;
  let onLimit: (() => void) | null = null;
  return {
    played,
    stops: () => stops,
    recording: () => recording,
    hitLimit: () => onLimit?.(),
    startRecording: (listener) => {
      const mic = options.mic ?? "ok";
      if (mic !== "ok") return Promise.resolve(mic);
      recording = true;
      onLimit = listener.onLimit;
      schedule(() => {
        if (recording) listener.onTick(1, 0.5);
      });
      return Promise.resolve("started");
    },
    stopRecording: () => {
      if (!recording) return Promise.resolve(null);
      recording = false;
      onLimit = null;
      clips += 1;
      const clip: MissionAudioClip = {
        uri: `fake://clip-${String(clips)}.wav`,
        seconds: options.seconds ?? 1.6,
      };
      return Promise.resolve(clip);
    },
    cancelRecording: () => {
      recording = false;
      onLimit = null;
    },
    play: (url, onEnd) => {
      if (options.playback === "unavailable") return "unavailable";
      played.push(url);
      playToken += 1;
      const mine = playToken;
      schedule(() => {
        if (mine === playToken) onEnd();
      });
      return "started";
    },
    stopPlayback: () => {
      stops += 1;
      playToken += 1;
    },
  };
}
