// 네이티브가 준 `unknown` 페이로드를 `speech-recognition-types.ts`의 타입으로
// 좁히는 순수 함수입니다. 브리지를 건너온 값은 `[String: Any]`가 풀린 `unknown`이라
// 모양을 믿지 않습니다. 읽는 자리를 아래 넷으로 모읍니다 — 열여섯 개 키를 각자
// 방어하면 같은 판단이 열여섯 벌이 되고, 한 벌만 고쳐지는 날이 옵니다.

import type {
  SpeechPermissionState,
  SpeechResult,
  SpeechResultStatus,
  SpeechStatus,
} from "./speech-recognition-types";

function field(payload: unknown, key: string): unknown {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  return (payload as Record<string, unknown>)[key];
}

function stringField(payload: unknown, key: string): string {
  const value = field(payload, key);
  return typeof value === "string" ? value : "";
}

function booleanField(payload: unknown, key: string): boolean {
  const value = field(payload, key);
  return value === true;
}

// `NaN`·`Infinity`를 0으로 접습니다 — 화면이 그대로 글자로 내는 값이고, 그 글자가
// 실기 기록에 남기 때문입니다. 읽을 수 없는 수는 읽을 수 없는 수로 남기지 않고
// 0으로 모읍니다.
function numberField(payload: unknown, key: string): number {
  const value = field(payload, key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * 권한 상태 하나를 정규화합니다. 아는 낱말이면 그대로, 아니면 `"unknown"`입니다.
 *
 * ⚠ **`restricted`를 `denied`로 접지 않습니다** — `SpeechPermissionState` 주석의
 * 근거 그대로입니다. 접는 코드가 없다는 것이 이 함수의 요점이라, 아는 낱말을
 * 목록으로 두고 목록에 있으면 손대지 않습니다.
 */
export function speechPermissionState(value: unknown): SpeechPermissionState {
  const known: readonly SpeechPermissionState[] = [
    "not-determined",
    "granted",
    "denied",
    "restricted",
    "unknown",
  ];

  return known.find((state) => state === value) ?? "unknown";
}

/**
 * 상태 페이로드를 타입 있는 모양으로 올립니다. 던지지 않습니다.
 *
 * 페이로드가 아예 어그러졌을 때 따로 상태 값을 만들지 않습니다 — 권한 둘이
 * `"unknown"`이고 나머지가 비어 있는 것이 그 자체로 「읽을 것이 없었다」를
 * 말합니다. 상태 조회에는 결과 쪽의 `status` 같은 축이 없어서, 없는 축을
 * 지어내면 화면이 그 값을 또 갈라야 합니다.
 */
export function speechStatus(payload: unknown): SpeechStatus {
  return {
    microphone: speechPermissionState(field(payload, "microphone")),
    speechRecognition: speechPermissionState(field(payload, "speechRecognition")),
    recognizerAvailable: booleanField(payload, "recognizerAvailable"),
    supportsOnDevice: booleanField(payload, "supportsOnDevice"),
    locale: stringField(payload, "locale"),
    listening: booleanField(payload, "listening"),
    bufferCount: numberField(payload, "bufferCount"),
    level: numberField(payload, "level"),
    peakLevel: numberField(payload, "peakLevel"),
  };
}

/**
 * 결과 페이로드를 타입 있는 모양으로 올립니다. 던지지 않습니다.
 *
 * **키마다 따로 읽습니다** — 페이로드 하나가 통째로 `malformed`가 되지 않습니다.
 * 열여섯 개 키 중 하나가 어그러졌다고 나머지 열다섯을 버리면 탐침이 볼 수 있었던
 * 것을 스스로 지우는 셈입니다. 읽히지 않은 키는 그 자리의 빈 값으로 남고,
 * `status`가 아는 낱말이 아니었다는 것은 `"malformed"`가 말합니다.
 */
export function speechResult(payload: unknown): SpeechResult {
  const known: readonly SpeechResultStatus[] = [
    "recognized",
    "recognition-failed",
    "permission-denied",
    "recognizer-unavailable",
    "audio-failed",
    "already-listening",
    "invalid-arguments",
  ];
  const status = field(payload, "status");

  return {
    status: known.find((candidate) => candidate === status) ?? "malformed",
    text: stringField(payload, "text"),
    isFinal: booleanField(payload, "isFinal"),
    microphone: speechPermissionState(field(payload, "microphone")),
    speechRecognition: speechPermissionState(field(payload, "speechRecognition")),
    requestedOnDevice: booleanField(payload, "requestedOnDevice"),
    supportsOnDevice: booleanField(payload, "supportsOnDevice"),
    requiresOnDevice: booleanField(payload, "requiresOnDevice"),
    // 아는 낱말 하나만 `"guaranteed"`로 올립니다. 모르는 값을 보장으로 읽으면
    // **없는 보장을 있다고 적는 것**이라, 접는 방향을 보수적인 쪽으로 고정합니다.
    // 날것이 필요한 자리는 위의 `requiresOnDevice`가 그대로 답합니다.
    onDevice: field(payload, "onDevice") === "guaranteed" ? "guaranteed" : "not-guaranteed",
    bufferCount: numberField(payload, "bufferCount"),
    peakLevel: numberField(payload, "peakLevel"),
    averageLevel: numberField(payload, "averageLevel"),
    durationMs: numberField(payload, "durationMs"),
    errorDomain: stringField(payload, "errorDomain"),
    errorCode: numberField(payload, "errorCode"),
    errorMessage: stringField(payload, "errorMessage"),
  };
}
