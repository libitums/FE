// 통합 테스트의 가짜 접점 — 소리 · 말하기 · 전체화면 · 사전 등록. 부른 기록을 값으로 남깁니다.
// trial-flow.test-support가 이 파일을 다시 내보냅니다(테스트의 import 줄은 그대로).

import type { SpeechFailure, TrialSfx } from "./trial-machine.contract";
import type {
  SpeechOutcome,
  TrialAudio,
  TrialFullscreen,
  TrialSpeech,
  VoiceOutcome,
} from "./trial-ports.contract";
import type { PreregLocale, PreregOutcome, TrialPreregPort } from "./trial-prereg.contract";

export type AudioCall =
  | { kind: "unlock"; step: string | null }
  | { kind: "voice"; url: string }
  | { kind: "sfx"; name: TrialSfx }
  | { kind: "prefetch"; urls: readonly string[] }
  | { kind: "stop" };

export type FakeAudio = TrialAudio & { readonly calls: AudioCall[] };

/** 부른 기록을 값으로 남기는 소리 접점. `voice`가 failed면 모든 음성이 실패합니다. */
export function fakeAudio(root: () => HTMLElement, voice: VoiceOutcome = "ended"): FakeAudio {
  const calls: AudioCall[] = [];
  return {
    calls,
    unlock: () => {
      calls.push({ kind: "unlock", step: root().getAttribute("data-step") });
    },
    playVoice: (url) => {
      calls.push({ kind: "voice", url });
      return Promise.resolve(voice);
    },
    playSfx: (name) => {
      calls.push({ kind: "sfx", name });
    },
    prefetch: (urls) => {
      calls.push({ kind: "prefetch", urls });
    },
    stopVoice: () => {
      calls.push({ kind: "stop" });
    },
  };
}

export const voicesOf = (audio: FakeAudio) =>
  audio.calls.flatMap((call) => (call.kind === "voice" ? [call.url] : []));
export const sfxOf = (audio: FakeAudio) =>
  audio.calls.flatMap((call) => (call.kind === "sfx" ? [call.name] : []));

export type FakeSpeech = TrialSpeech & {
  readonly listens: number;
  readonly stops: number;
  readonly aborts: number;
  /** 다음 listen()이 바로 낼 결과를 줄 세웁니다. 줄이 비면 listen은 `resolvePending`을 기다립니다. */
  queue(outcome: SpeechOutcome): void;
  resolvePending(outcome: SpeechOutcome): void;
};

export function fakeSpeech(support: "supported" | "unsupported"): FakeSpeech {
  const queued: SpeechOutcome[] = [];
  let pending: ((outcome: SpeechOutcome) => void) | null = null;
  const counts = { listens: 0, stops: 0, aborts: 0 };
  return {
    support,
    get listens() {
      return counts.listens;
    },
    get stops() {
      return counts.stops;
    },
    get aborts() {
      return counts.aborts;
    },
    queue: (outcome) => {
      queued.push(outcome);
    },
    resolvePending: (outcome) => {
      const resolve = pending;
      pending = null;
      resolve?.(outcome);
    },
    listen: () => {
      counts.listens += 1;
      const next = queued.shift();
      if (next !== undefined) return Promise.resolve(next);
      return new Promise<SpeechOutcome>((resolve) => {
        pending = resolve;
      });
    },
    stop: () => {
      counts.stops += 1;
    },
    abort: () => {
      counts.aborts += 1;
    },
  };
}

export type FakeFullscreen = TrialFullscreen & { readonly calls: ("request" | "exit")[] };

export function fakeFullscreen(): FakeFullscreen {
  const calls: ("request" | "exit")[] = [];
  return {
    calls,
    request: () => {
      calls.push("request");
    },
    exit: () => {
      calls.push("exit");
    },
  };
}

export type FakePrereg = TrialPreregPort & {
  readonly submits: { email: string; locale: PreregLocale }[];
  /** 다음 submit이 낼 결과를 줄 세웁니다. 줄이 비면 submit은 `resolvePending`을 기다립니다. */
  queue(outcome: PreregOutcome): void;
  resolvePending(outcome: PreregOutcome): void;
};

export function fakePrereg(): FakePrereg {
  const submits: { email: string; locale: PreregLocale }[] = [];
  const queued: PreregOutcome[] = [];
  let pending: ((outcome: PreregOutcome) => void) | null = null;
  return {
    submits,
    queue: (outcome) => {
      queued.push(outcome);
    },
    resolvePending: (outcome) => {
      const resolve = pending;
      pending = null;
      resolve?.(outcome);
    },
    submit: (email, locale) => {
      submits.push({ email, locale });
      const next = queued.shift();
      if (next !== undefined) return Promise.resolve(next);
      return new Promise<PreregOutcome>((resolve) => {
        pending = resolve;
      });
    },
  };
}

export const heard = (...alternatives: string[]): SpeechOutcome => ({
  kind: "heard",
  alternatives,
});
export const failed = (reason: SpeechFailure): SpeechOutcome => ({ kind: "failed", reason });
