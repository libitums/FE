// 기기 안(온디바이스) 한국어 인식 팩의 상태 · 내려받기 접점과 그 순수 판정입니다. 화면은 아직 없습니다 — 내려받기를
// 권할지는 `koreanPackOfferOf` 하나가 정하고, 동의 화면이 그것을 읽습니다.
//
// 메서드가 있는 호스트는 Android뿐입니다. iOS · 옛 Android 호스트에는 메서드가 없고, 그때 접점 함수는
// `openSpeechSettings`처럼 `"unavailable"`을 돌려주고 콜백을 부르지 않습니다 — 없는 상태를 지어내지 않습니다.

import type {
  SpeechKoreanPack,
  SpeechRecognitionModule,
  SpeechRequestOutcome,
} from "./speech-recognition-types";

/**
 * 내려받기 요청 한 번의 결말입니다. `completed` 깔림 · `scheduled` 시스템이 나중에 받기로 함(예 Wi-Fi 대기) ·
 * `requested` 시스템에 맡겼으나 결말을 알 수 없음(Android 13) · `failed` 실패(`errorCode`) · `unsupported` 받을 수 없는 기기.
 */
export type KoreanPackDownloadStatus =
  | "completed"
  | "scheduled"
  | "requested"
  | "failed"
  | "unsupported";

export type KoreanPackDownloadResult = {
  readonly status: KoreanPackDownloadStatus;
  readonly errorCode: number;
};

/** 내려받기를 권할지입니다. */
export type KoreanPackOffer = "offer" | "none";

/** 호스트가 내려받기 진행률(0~100)을 실어 보내는 전역 이벤트 이름입니다. */
export const koreanPackProgressEvent = "speechKoreanPackProgress";

const knownPacks: readonly SpeechKoreanPack[] = [
  "installed",
  "downloading",
  "available",
  "unsupported",
  "unknown",
];

const knownDownloads: readonly KoreanPackDownloadStatus[] = [
  "completed",
  "scheduled",
  "requested",
  "failed",
  "unsupported",
];

function field(payload: unknown, key: string): unknown {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  return (payload as Record<string, unknown>)[key];
}

/** 팩 상태 하나를 정규화합니다. 아는 낱말이 아니면 `"unknown"`입니다. */
export function speechKoreanPack(value: unknown): SpeechKoreanPack {
  return knownPacks.find((pack) => pack === value) ?? "unknown";
}

/** 내려받기 결말 페이로드를 좁힙니다. 던지지 않고, 읽을 수 없으면 `failed` · 0입니다. */
export function koreanPackDownloadResult(payload: unknown): KoreanPackDownloadResult {
  const status = field(payload, "status");
  const errorCode = field(payload, "errorCode");
  return {
    status: knownDownloads.find((known) => known === status) ?? "failed",
    errorCode: typeof errorCode === "number" && Number.isFinite(errorCode) ? errorCode : 0,
  };
}

/**
 * 내려받기를 권할지 — **동의 화면의 이음매**입니다. 받을 수 있다고 확인된(`available`) 때만 권합니다.
 * `available`은 Android 13+ 호스트만 내므로 API 수준을 따로 묻지 않습니다. 받는 중 · 깔림 · 못 받음 · 모름은 권하지 않습니다.
 */
export function koreanPackOfferOf(pack: SpeechKoreanPack): KoreanPackOffer {
  return pack === "available" ? "offer" : "none";
}

function nativeModule(): SpeechRecognitionModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["SpeechRecognitionModule"] as
    | SpeechRecognitionModule
    | null
    | undefined;
  return module ?? undefined;
}

/** 한국어 팩 상태를 묻습니다. 메서드가 없는 호스트면 `"unavailable"`이고 콜백은 오지 않습니다. */
export function getSpeechKoreanPack(onPack: (pack: SpeechKoreanPack) => void): SpeechRequestOutcome {
  const host = nativeModule();
  if (host === undefined || typeof host.getKoreanPack !== "function") {
    return "unavailable";
  }
  host.getKoreanPack((payload) => onPack(speechKoreanPack(field(payload, "koreanPack"))));
  return "requested";
}

/**
 * 한국어 팩 내려받기를 시스템에 맡깁니다. 결말은 콜백 한 번이고, 진행률은 `subscribeKoreanPackProgress`가 받습니다.
 * **동의를 받은 뒤에만 부릅니다** — 이 함수는 묻지 않습니다. 메서드가 없는 호스트면 `"unavailable"`입니다.
 */
export function downloadSpeechKoreanPack(
  onResult: (result: KoreanPackDownloadResult) => void,
): SpeechRequestOutcome {
  const host = nativeModule();
  if (host === undefined || typeof host.downloadKoreanPack !== "function") {
    return "unavailable";
  }
  host.downloadKoreanPack((payload) => onResult(koreanPackDownloadResult(payload)));
  return "requested";
}

type GlobalEventEmitter = {
  addListener: (name: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (name: string, listener: (...args: unknown[]) => void) => void;
};

/** 내려받기 진행률(0~100)을 받습니다. 돌려준 함수로 그만 받습니다. 이미터가 없는 환경에서는 아무것도 하지 않습니다. */
export function subscribeKoreanPackProgress(listener: (percent: number) => void): () => void {
  if (typeof lynx === "undefined") {
    return () => {};
  }
  const emitter = lynx.getJSModule("GlobalEventEmitter") as unknown as
    | GlobalEventEmitter
    | undefined;
  if (emitter === undefined) {
    return () => {};
  }
  const forward = (...args: unknown[]): void => {
    const percent = args[0];
    if (typeof percent === "number" && Number.isFinite(percent)) {
      listener(Math.max(0, Math.min(100, percent)));
    }
  };
  emitter.addListener(koreanPackProgressEvent, forward);
  return () => emitter.removeListener(koreanPackProgressEvent, forward);
}
