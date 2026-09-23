// 말하기 인식 접점이 주고받는 어휘입니다. 권한·상태·결과·옵션 타입과 네이티브
// 모듈의 모양을 소유합니다 — `speech-recognition.ts`가 이 타입들로 명령을 열고,
// `speech-recognition-payload.ts`가 이 타입들로 페이로드를 좁힙니다.

/** 호스트가 `SpeechRecognitionModule`이라는 이름으로 등록합니다. */
export interface SpeechRecognitionModule {
  getStatus(callback: (payload: unknown) => void): void;
  requestPermissions(callback: (payload: unknown) => void): void;
  start(args: Record<string, unknown>, callback: (payload: unknown) => void): void;
  stop(): void;
}

/**
 * 권한 하나의 상태입니다.
 *
 * ⚠ **`restricted`를 `denied`로 접지 않습니다.** 가르는 기준이 *"사용자가
 * 되돌릴 수 있는가"* 라, 되돌릴 수 있는 거부와 기기 정책이 막아 되돌릴 수 없는
 * 제한은 화면이 할 일이 다릅니다 — 앞엣것은 설정으로 보내고 뒤엣것은 보낼 곳이
 * 없습니다.
 *
 * `"unknown"`은 네이티브의 `@unknown default`가 내는 값이자, 브리지를 건너온 값이
 * 아는 낱말이 아닐 때 이 파일이 내는 값입니다. **둘을 가르지 않습니다** — 어느
 * 쪽이든 「모른다」이고, 모르는 것을 아는 척 접으면 그 자리가 관찰에서 사라집니다.
 */
export type SpeechPermissionState =
  | "not-determined"
  | "granted"
  | "denied"
  | "restricted"
  | "unknown";

/**
 * `getStatus` · `requestPermissions`가 올리는 모양입니다. **둘이 같은 모양을
 * 씁니다** — 받는 쪽이 모양 하나만 알면 되게 하려는 네이티브의 결정을 그대로
 * 따릅니다.
 *
 * 권한 둘이 **각각 필드**입니다. 한 값으로 뭉치지 않는 이유는 위 머리말과 같습니다.
 */
export type SpeechStatus = {
  readonly microphone: SpeechPermissionState;
  readonly speechRecognition: SpeechPermissionState;
  readonly recognizerAvailable: boolean;
  readonly supportsOnDevice: boolean;
  readonly locale: string;
  readonly listening: boolean;
  readonly bufferCount: number;
  /** 가장 최근 버퍼의 RMS입니다. `0...1`이고 **배율이 곱해지지 않은 날값**입니다. */
  readonly level: number;
  readonly peakLevel: number;
};

/**
 * 인식 **한 번의 결과**의 상태 값입니다.
 *
 * 마지막 `"malformed"`만 JS 쪽에서 생깁니다 — 브리지를 건너온 값이 아는 낱말을
 * 싣고 오지 않았을 때입니다. 네이티브의 값으로 접지 않습니다: 「인식기가
 * 실패했다」와 「페이로드가 어그러졌다」는 다음에 할 일이 완전히 다릅니다.
 */
export type SpeechResultStatus =
  | "recognized"
  | "recognition-failed"
  | "permission-denied"
  | "recognizer-unavailable"
  | "audio-failed"
  | "already-listening"
  | "invalid-arguments"
  | "malformed";

/**
 * 온디바이스 **보장 여부**입니다. `"guaranteed"`가 아닌 것을 `"server"`라고 적지
 * 않습니다 — 껐을 때 시스템이 실제로 어디서 처리했는지는 공개 API가 답하지
 * 않습니다. 모르는 것을 안다고 적으면 다음 사람이 그 값을 근거로 네트워크
 * 의존을 판정합니다.
 */
export type SpeechOnDevice = "guaranteed" | "not-guaranteed";

/**
 * `start`의 콜백이 **세션이 끝날 때 정확히 한 번** 싣고 오는 것입니다.
 *
 * 온디바이스 축이 **넷 다 남습니다** — `requestedOnDevice`(우리가 요청한 것) ·
 * `supportsOnDevice`(기기가 할 수 있는 것) · `requiresOnDevice`(실제로 세운 것) ·
 * `onDevice`(그 결론). 넷을 하나로 줄이면 「요청을 안 했다」와 「요청했는데 기기가
 * 못 한다」가 같은 값이 되고, 조용한 서버 인식이 이 탐침의 관찰 대상이라 그
 * 갈림이 곧 물음 자체입니다.
 */
export type SpeechResult = {
  readonly status: SpeechResultStatus;
  /** ⭐ **빈 문자열도 유효한 값입니다.** 듣고도 못 읽은 것은 오류가 아니라 관측입니다. */
  readonly text: string;
  readonly isFinal: boolean;
  readonly microphone: SpeechPermissionState;
  readonly speechRecognition: SpeechPermissionState;
  readonly requestedOnDevice: boolean;
  readonly supportsOnDevice: boolean;
  readonly requiresOnDevice: boolean;
  readonly onDevice: SpeechOnDevice;
  readonly bufferCount: number;
  readonly peakLevel: number;
  readonly averageLevel: number;
  readonly durationMs: number;
  readonly errorDomain: string;
  readonly errorCode: number;
  readonly errorMessage: string;
};

/** `start`에 넘길 것입니다. 네이티브가 읽는 키가 이것뿐입니다. */
export type SpeechStartOptions = {
  /** 생략하면 네이티브의 기본(켬)입니다 — 기본값을 여기서 다시 적지 않습니다. */
  readonly requireOnDevice?: boolean;
};

/**
 * **요청 한 번의 결과**입니다. 권한 상태도 인식 결과도 아니고, 접점이 있어서
 * 요청이 건너갔는가를 답합니다.
 *
 * boolean이 아니라 union인 이유는 `audio.ts`·`handwriting-recognition.ts`와
 * 같습니다 — `true`가 호출자마다 다른 뜻으로 읽힙니다.
 */
export type SpeechRequestOutcome = "requested" | "unavailable";
