// 테스트 지원 — 호스트의 `SpeechRecognitionModule`과 낭독 모듈 대역입니다. 제품 코드는 import하지 않습니다.
// `lib/speech-recognition.ts`는 mock하지 않고, 전역 `NativeModules`만 갈아 끼웁니다.

import { vi } from "vitest";

export type SpeechHostResult = {
  readonly status: string;
  readonly text: string;
  readonly errorDomain?: string;
  readonly errorCode?: number;
  /** Android 호스트만 싣습니다 — 한국어 팩 상태 · 네트워크로 되돌아감 · 되돌아가게 한 오류 코드. */
  readonly koreanPack?: string;
  readonly fallback?: string;
  readonly fallbackErrorCode?: number;
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
  /** 주면 `getStatus`가 지금 권한에 이 필드를 덧붙여 곧바로 답합니다(공용 마이크의 음량 읽기). */
  readonly status?: Readonly<Record<string, unknown>>;
  /** 참이면 `getStatus`가 지금 권한으로 답합니다(ADR-0206 — 화면이 열릴 때 확인). 거짓이면 예전처럼 답하지 않습니다. */
  readonly answerStatus?: boolean;
  /** `requestPermissions`가 미요청 권한에 내릴 답입니다(시스템 창). 주지 않으면 미요청은 그대로 남습니다. */
  readonly onAsk?: "granted" | "denied";
  /** 있으면 `StorageModule`을 이 표로 세웁니다(사전 안내를 봤는가 기록). */
  readonly storage?: Map<string, string>;
};

export type SpeechHost = {
  readonly calls: {
    request: number;
    start: number;
    stop: number;
    status: number;
    openSettings: number;
  };
  /** 지금 권한 — 테스트가 바꾸면 다음 조회 · 요청이 그 값으로 답합니다(설정에서 켜고 돌아옴 흉내). */
  readonly permissions: { microphone: string; speechRecognition: string };
  /** 보관한 `start` 콜백입니다 — 테스트가 부르면 그 시도의 결과가 옵니다. */
  readonly pending: ((payload: unknown) => void)[];
  /** 채점 · 안내 낭독(builtin)과 완료 낭독(completion)이 받은 글자입니다. */
  readonly announced: { builtin: string[]; completion: string[] };
};

export function stubSpeechHost(options: SpeechHostOptions = {}): SpeechHost {
  const host: SpeechHost = {
    calls: { request: 0, start: 0, stop: 0, status: 0, openSettings: 0 },
    permissions: {
      microphone: options.microphone ?? "granted",
      speechRecognition: options.speechRecognition ?? "granted",
    },
    pending: [],
    announced: { builtin: [], completion: [] },
  };
  const statusPayload = () => ({
    ...host.permissions,
    recognizerAvailable: options.recognizerAvailable ?? true,
  });
  const speechModule = {
    getStatus: (callback: (payload: unknown) => void) => {
      host.calls.status += 1;
      if (options.status !== undefined) callback({ ...statusPayload(), ...options.status });
      else if (options.answerStatus === true) callback(statusPayload());
    },
    requestPermissions: (callback: (payload: unknown) => void) => {
      host.calls.request += 1;
      const answer = options.onAsk;
      if (answer !== undefined) {
        for (const key of ["microphone", "speechRecognition"] as const) {
          if (host.permissions[key] === "not-determined") host.permissions[key] = answer;
        }
      }
      callback(statusPayload());
    },
    openSettings: () => {
      host.calls.openSettings += 1;
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
    ...(options.storage === undefined ? {} : { StorageModule: storageModule(options.storage) }),
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

/** Android 인식기가 말을 못 알아들었을 때(ERROR_NO_MATCH 7)의 결과입니다(ADR-0181). */
export const androidNoMatch: SpeechHostResult = {
  status: "recognition-failed",
  text: "",
  errorDomain: "android.speech.SpeechRecognizer",
  errorCode: 7,
  koreanPack: "available",
  fallback: "none",
};

/** Android 인식기가 네트워크에 닿지 못했을 때(ERROR_NETWORK 2)의 결과입니다. */
export const androidNetwork: SpeechHostResult = {
  status: "recognition-failed",
  text: "",
  errorDomain: "android.speech.SpeechRecognizer",
  errorCode: 2,
  koreanPack: "available",
  fallback: "none",
};

/** iOS 인식기가 말을 듣지 못했을 때(kAFAssistantErrorDomain 1110)의 결과입니다. */
export const iosNoSpeech: SpeechHostResult = {
  status: "recognition-failed",
  text: "",
  errorDomain: "kAFAssistantErrorDomain",
  errorCode: 1110,
};

function storageModule(table: Map<string, string>) {
  return {
    get: (key: string) => table.get(key) ?? null,
    set: (key: string, value: string) => {
      table.set(key, value);
    },
    remove: (key: string) => {
      table.delete(key);
    },
  };
}
