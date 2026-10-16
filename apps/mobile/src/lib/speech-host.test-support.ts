// 테스트 지원 — 호스트의 `SpeechRecognitionModule`과 낭독 모듈 대역입니다. 제품 코드는 import하지 않습니다.
// `lib/speech-recognition.ts`는 mock하지 않고, 전역 `NativeModules`만 갈아 끼웁니다.

import { vi } from "vitest";

export type SpeechHostResult = {
  readonly status: string;
  readonly text: string;
  readonly errorDomain?: string;
  readonly errorCode?: number;
};

export type SpeechHostOptions = {
  /** `false`면 `SpeechRecognitionModule` 키 자체를 두지 않습니다(접점 없음). */
  readonly module?: boolean;
  readonly microphone?: string;
  readonly speechRecognition?: string;
  readonly recognizerAvailable?: boolean;
  /**
   * `start` 호출 순번(0부터)에 대한 결과입니다. 결과 객체면 즉시 콜백하고, `null`이면 콜백을 보관합니다
   * (`pending`에 쌓입니다). 주지 않으면 늘 보관합니다.
   */
  readonly result?: (attempt: number) => SpeechHostResult | null;
};

export type SpeechHost = {
  readonly calls: { request: number; start: number; stop: number };
  /** 보관한 `start` 콜백입니다 — 테스트가 부르면 그 시도의 결과가 옵니다. */
  readonly pending: ((payload: unknown) => void)[];
  /** 채점 · 안내 낭독(builtin)과 완료 낭독(completion)이 받은 글자입니다. */
  readonly announced: { builtin: string[]; completion: string[] };
};

export function stubSpeechHost(options: SpeechHostOptions = {}): SpeechHost {
  const host: SpeechHost = {
    calls: { request: 0, start: 0, stop: 0 },
    pending: [],
    announced: { builtin: [], completion: [] },
  };
  const speechModule = {
    getStatus: () => {},
    requestPermissions: (callback: (payload: unknown) => void) => {
      host.calls.request += 1;
      callback({
        microphone: options.microphone ?? "granted",
        speechRecognition: options.speechRecognition ?? "granted",
        recognizerAvailable: options.recognizerAvailable ?? true,
      });
    },
    start: (_args: unknown, callback: (payload: unknown) => void) => {
      const attempt = host.calls.start;
      host.calls.start += 1;
      const result = options.result?.(attempt) ?? null;
      if (result === null) host.pending.push(callback);
      else callback({ ...result, isFinal: true });
    },
    stop: () => {
      host.calls.stop += 1;
    },
  };
  vi.stubGlobal("NativeModules", {
    ...(options.module === false ? {} : { SpeechRecognitionModule: speechModule }),
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        host.announced.builtin.push(args.content);
        callback("announced");
      },
    },
    CompletionAnnouncementModule: {
      announce: (args: { content: string }, callback: (result: unknown) => void) => {
        host.announced.completion.push(args.content);
        callback("announced");
      },
    },
  });
  return host;
}

export const recognized = (text: string): SpeechHostResult => ({ status: "recognized", text });

export const dictationOff: SpeechHostResult = {
  status: "recognition-failed",
  text: "",
  errorDomain: "kLSRErrorDomain",
  errorCode: 201,
};

export const audioFailed: SpeechHostResult = { status: "audio-failed", text: "" };
