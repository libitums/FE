// 브라우저 소리(Web Audio) 접점입니다 — 음성 · 효과음 · 잠금 해제 · 받아 두기.
// 컨텍스트 하나에 음성(한 번에 하나)과 효과음(겹쳐도 됨)을 냅니다. 무엇이 실패해도 던지지 않고 진행을 막지 않습니다.

import type { TrialSfx } from "./trial-machine.contract";
import type { CreateTrialAudio, VoiceOutcome } from "./trial-ports.contract";

/** 받기 상한 — 넘으면 그 소리는 실패로 칩니다. */
const FETCH_LIMIT_MS = 8_000;
const SFX: readonly TrialSfx[] = [
  "button",
  "correct_answer",
  "wrong_answer",
  "pass_lesson",
  "lesson_complete",
];

type AudioScope = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  navigator: Navigator & { audioSession?: { type: string } };
};

type Playing = {
  readonly source: AudioBufferSourceNode;
  readonly finish: (o: VoiceOutcome) => void;
};

export const createTrialAudio: CreateTrialAudio = (window, sfxBase) => {
  const scope = window as AudioScope;
  const Context = scope.AudioContext ?? scope.webkitAudioContext;
  let context: AudioContext | null = null;
  const bytes = new Map<string, Promise<ArrayBuffer | null>>();
  const decoded = new Map<string, Promise<AudioBuffer | null>>();
  const lengths = new Map<string, number>();
  let playing: Playing | null = null;
  /** 지금 기다리는 음성 요청 — 멈추거나 다음 음성이 오면 바뀝니다. */
  let voiceRequest = 0;

  function fetchBytes(url: string): Promise<ArrayBuffer | null> {
    const cached = bytes.get(url);
    if (cached !== undefined) return cached;
    const pending = (async () => {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = scope.setTimeout(() => controller?.abort(), FETCH_LIMIT_MS);
      try {
        const response = await scope.fetch(url, controller ? { signal: controller.signal } : {});
        return response.ok ? await response.arrayBuffer() : null;
      } catch {
        return null;
      } finally {
        scope.clearTimeout(timer);
      }
    })();
    bytes.set(url, pending);
    // 실패는 남겨 두지 않아 다음 요청이 다시 받습니다.
    void pending.then((value) => {
      if (value === null) bytes.delete(url);
    });
    return pending;
  }

  function decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer | null> {
    return new Promise<AudioBuffer | null>((resolve) => {
      try {
        // 옛 Safari는 콜백 꼴만 압니다 — 두 꼴을 함께 받습니다.
        const result = ctx.decodeAudioData(data.slice(0), resolve, () => resolve(null));
        if (result && typeof result.then === "function") result.then(resolve, () => resolve(null));
      } catch {
        resolve(null);
      }
    });
  }

  function bufferOf(url: string): Promise<AudioBuffer | null> {
    const ctx = context;
    if (ctx === null) return Promise.resolve(null);
    const cached = decoded.get(url);
    if (cached !== undefined) return cached;
    const pending = fetchBytes(url).then((data) => (data === null ? null : decode(ctx, data)));
    decoded.set(url, pending);
    void pending.then((buffer) => {
      if (buffer === null) decoded.delete(url);
      else lengths.set(url, buffer.duration * 1000);
    });
    return pending;
  }

  function start(buffer: AudioBuffer): AudioBufferSourceNode | null {
    const ctx = context;
    if (ctx === null) return null;
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      return source;
    } catch {
      return null;
    }
  }

  function stopVoice(): void {
    voiceRequest += 1;
    const current = playing;
    playing = null;
    if (current === null) return;
    try {
      current.source.stop();
    } catch {
      // 이미 끝난 소스는 멈출 수 없습니다.
    }
    current.finish("stopped");
  }

  const sfxUrl = (name: TrialSfx) => `${sfxBase}${name}.mp3`;

  /** 시작 뒤 멈춘 컨텍스트(iOS 통화 · 백그라운드 · 마이크 — suspended · interrupted)를 깨웁니다. 던지지 않습니다. */
  function wake(): void {
    const ctx = context;
    if (ctx === null || ctx.state === "running") return;
    try {
      void ctx.resume?.().catch(() => undefined);
    } catch {
      // 깨울 수 없으면 다음 사용자 활성화에서 다시 시도합니다.
    }
  }

  return {
    unlock: () => {
      if (context !== null) {
        wake();
        return;
      }
      if (typeof Context !== "function") return;
      try {
        // iOS 무음 스위치가 켜져 있어도 소리가 나게 합니다(지원하는 브라우저만).
        if (scope.navigator.audioSession) scope.navigator.audioSession.type = "playback";
      } catch {
        // 설정할 수 없으면 기본 세션 그대로입니다.
      }
      try {
        const ctx = new Context();
        context = ctx;
        void ctx.resume?.().catch(() => undefined);
        // 탭 처리기 안에서 무음 1샘플을 내야 iOS가 컨텍스트를 풉니다.
        const silent = ctx.createBuffer(1, 1, 22_050);
        start(silent);
      } catch {
        context = null;
        return;
      }
      for (const name of SFX) void bufferOf(sfxUrl(name));
    },
    playVoice: async (url) => {
      stopVoice();
      const request = voiceRequest;
      if (context === null) return "failed";
      const buffer = await bufferOf(url);
      if (request !== voiceRequest) return "stopped";
      if (buffer === null) return "failed";
      wake();
      return new Promise<VoiceOutcome>((resolve) => {
        let done = false;
        const finish = (outcome: VoiceOutcome) => {
          if (done) return;
          done = true;
          if (playing?.source === source) playing = null;
          resolve(outcome);
        };
        const source = start(buffer);
        if (source === null) {
          finish("failed");
          return;
        }
        source.onended = () => finish("ended");
        playing = { source, finish };
      });
    },
    playSfx: (name) => {
      void bufferOf(sfxUrl(name)).then((buffer) => {
        if (buffer === null) return;
        wake();
        start(buffer);
      });
    },
    prefetch: (urls) => {
      for (const url of urls) {
        if (context === null) void fetchBytes(url);
        else void bufferOf(url);
      }
    },
    stopVoice,
    resume: wake,
    voiceLengthMs: (url) => lengths.get(url) ?? null,
  };
};
