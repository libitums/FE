// 브라우저 말하기(Web Speech)입니다 — 오류 까닭 · 대안 · 지원 여부의 순수 분류와, 그것을 쓰는 인식기 접점.

import type { SpeechFailure } from "./trial-machine.contract";
import type {
  CreateTrialSpeech,
  SpeechOutcome,
  SpeechAlternativesOf,
  SpeechFailureOf,
  SpeechSupportOf,
} from "./trial-ports.contract";

const FAILURES: Readonly<Record<string, SpeechFailure>> = {
  "no-speech": "no-speech",
  "not-allowed": "denied",
  // iOS에서 Siri · 받아쓰기가 꺼진 경우도 여기로 옵니다.
  "service-not-allowed": "denied",
  "language-not-supported": "unsupported",
  aborted: "aborted",
};

/** `SpeechRecognitionErrorEvent.error` → 실패 까닭. 모르는 값(`audio-capture` · `network` 포함)은 unavailable. */
export const speechFailureOf: SpeechFailureOf = (error) =>
  Object.hasOwn(FAILURES, error) ? (FAILURES[error] ?? "unavailable") : "unavailable";

/** 첫 결과의 대안들 → 앞뒤 공백을 다듬고 빈 값을 뺀 대안. */
export const speechAlternativesOf: SpeechAlternativesOf = (results) => {
  const first = results.length > 0 ? results[0] : undefined;
  if (first === undefined) return [];
  return Array.from(first, (alternative) => alternative.transcript.trim()).filter(
    (transcript) => transcript !== "",
  );
};

/** `SpeechRecognition ?? webkitSpeechRecognition` 생성자가 있는가. */
export const speechSupportOf: SpeechSupportOf = (scope) => {
  const globals = scope as Record<string, unknown>;
  const constructor = globals["SpeechRecognition"] ?? globals["webkitSpeechRecognition"];
  return typeof constructor === "function" ? "supported" : "unsupported";
};

/** 한 번 듣기의 상한 — 지나면 멈추고 그때까지 들은 것으로 끝냅니다. */
const LISTEN_LIMIT_MS = 8_000;
const ALTERNATIVES = 3;

type RecognitionEvent = {
  readonly results?: ArrayLike<ArrayLike<{ readonly transcript: string }>>;
  readonly error?: string;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;

const failed = (reason: SpeechFailure): SpeechOutcome => ({ kind: "failed", reason });

const unsupportedSpeech = {
  support: "unsupported",
  listen: () => Promise.resolve(failed("unsupported")),
  stop: () => undefined,
  abort: () => undefined,
} as const;

/** 브라우저 말하기 접점입니다 — ko-KR · 한 번 · 대안 셋 · 8초. 권한은 첫 `start()`가 묻습니다. */
export const createTrialSpeech: CreateTrialSpeech = (window) => {
  if (speechSupportOf(window) === "unsupported") return unsupportedSpeech;
  const globals = window as unknown as Record<string, unknown>;
  const Recognizer = (globals["SpeechRecognition"] ??
    globals["webkitSpeechRecognition"]) as RecognitionConstructor;
  let active: {
    readonly recognition: Recognition;
    readonly finish: (o: SpeechOutcome) => void;
  } | null = null;

  function abort(): void {
    const current = active;
    active = null;
    if (current === null) return;
    try {
      current.recognition.abort();
    } catch {
      // 이미 끝난 인식기입니다.
    }
    current.finish(failed("aborted"));
  }

  return {
    support: "supported",
    listen: () => {
      abort();
      return new Promise<SpeechOutcome>((resolve) => {
        let done = false;
        let alternatives: readonly string[] = [];
        let recognition: Recognition | null = null;
        const finish = (outcome: SpeechOutcome) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          if (active?.recognition === recognition) active = null;
          resolve(outcome);
        };
        const timer = window.setTimeout(() => {
          try {
            recognition?.stop();
          } catch {
            finish(failed("no-speech"));
          }
        }, LISTEN_LIMIT_MS);
        try {
          const created = new Recognizer();
          recognition = created;
          created.lang = "ko-KR";
          created.continuous = false;
          created.interimResults = false;
          created.maxAlternatives = ALTERNATIVES;
          created.onresult = (event) => {
            alternatives = speechAlternativesOf(event.results ?? []);
          };
          created.onerror = (event) => finish(failed(speechFailureOf(event.error ?? "")));
          created.onend = () =>
            finish(alternatives.length > 0 ? { kind: "heard", alternatives } : failed("no-speech"));
          active = { recognition: created, finish };
          created.start();
        } catch {
          finish(failed("unavailable"));
        }
      });
    },
    stop: () => {
      try {
        active?.recognition.stop();
      } catch {
        // 멈출 인식기가 없습니다.
      }
    },
    abort,
  };
};
