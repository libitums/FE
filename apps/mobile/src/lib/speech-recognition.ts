// 말하기 인식 접점. 호스트 앱의 `SpeechRecognitionModule`을 감싼다. 접점은 모듈마다
// 파일 하나다 (ADR-0017 D3) — 화면은 `NativeModules`를 직접 만지지 않는다.
// 이름은 선례 규약 그대로다: 감싸는 모듈 이름을 케밥으로 적는다
// (`handwriting-recognition.ts`가 `HandwritingRecognitionModule`을 감싸는 것과 같다).
//
// **이 파일이 지는 것 — ADR-0026 D3의 2단계 판별.**
// 1. **접점이 있는가.** `typeof NativeModules` 가드가 답한다. 없으면 **거기서 끝이다** —
//    권한 상태를 물을 자리조차 없다. 상태를 답하는 것이 그 모듈이기 때문이다.
//    이 구조가 코드에 드러나도록, 상태를 나르는 함수들이 전부 **반환값**으로 1단계를
//    답하고 **콜백**으로 2단계를 나른다. 반환값이 `"unavailable"`이면 콜백은 오지 않는다.
// 2. **있으면 모듈이 답하는 권한 상태를 읽는다.** 그 값이 아래 `SpeechStatus`다.
//
// **이 파일이 정하지 않는 것 — 거부 조합의 처방 전부.**
// 「마이크 허용 · 인식 거부」일 때 무엇을 해야 하는지, 어느 조합에서 진행을 막고 어느
// 조합에서 설정으로 보내는지를 여기서 정하지 않는다. 상태 둘을 **각각 있는 그대로**
// 올릴 뿐이다. 조합을 「진행 가능/불가」 불리언 하나로 뭉개는 함수를 두지 않는 것이
// 이 파일의 결정이다 — 뭉개면 탐침이 관찰하려는 갈림(조합마다 사람이 할 일이 다르다)이
// 값에서 사라지고, 그 처방을 고른 자리가 접점 파일이 되어 버린다. 고르는 자리는 화면이다.

/** 호스트가 `SpeechRecognitionModule`이라는 이름으로 등록한다. */
interface SpeechRecognitionModule {
  getStatus(callback: (payload: unknown) => void): void;
  requestPermissions(callback: (payload: unknown) => void): void;
  start(args: Record<string, unknown>, callback: (payload: unknown) => void): void;
  stop(): void;
}

/**
 * 권한 하나의 상태.
 *
 * ⚠ **`restricted`를 `denied`로 접지 않는다** (ADR-0026 D3). 가르는 기준이 *"사용자가
 * 되돌릴 수 있는가"* 라, 되돌릴 수 있는 거부와 기기 정책이 막아 되돌릴 수 없는 제한은
 * 화면이 할 일이 다르다 — 앞엣것은 설정으로 보내고 뒤엣것은 보낼 곳이 없다.
 *
 * `"unknown"`은 네이티브의 `@unknown default`가 내는 값이자, 브리지를 건너온 값이
 * 아는 낱말이 아닐 때 이 파일이 내는 값이다. **둘을 가르지 않는다** — 어느 쪽이든
 * 「모른다」이고, 모르는 것을 아는 척 접으면 그 자리가 관찰에서 사라진다.
 */
export type SpeechPermissionState =
  | "not-determined"
  | "granted"
  | "denied"
  | "restricted"
  | "unknown";

/**
 * `getStatus` · `requestPermissions`가 올리는 모양. **둘이 같은 모양을 쓴다** —
 * 받는 쪽이 모양 하나만 알면 되게 하려는 네이티브의 결정을 그대로 따른다.
 *
 * 권한 둘이 **각각 필드**다. 한 값으로 뭉치지 않는 이유는 위 머리말과 같다.
 */
export type SpeechStatus = {
  readonly microphone: SpeechPermissionState;
  readonly speechRecognition: SpeechPermissionState;
  readonly recognizerAvailable: boolean;
  readonly supportsOnDevice: boolean;
  readonly locale: string;
  readonly listening: boolean;
  readonly bufferCount: number;
  /** 가장 최근 버퍼의 RMS. `0...1`이고 **배율이 곱해지지 않은 날값**이다. */
  readonly level: number;
  readonly peakLevel: number;
};

/**
 * 인식 **한 번의 결과**의 상태 값.
 *
 * 마지막 `"malformed"`만 JS 쪽에서 생긴다 — 브리지를 건너온 값이 아는 낱말을 싣고
 * 오지 않았을 때다. 네이티브의 값으로 접지 않는다: 「인식기가 실패했다」와 「페이로드가
 * 어그러졌다」는 다음에 할 일이 완전히 다르다.
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
 * 온디바이스 **보장 여부**. `"guaranteed"`가 아닌 것을 `"server"`라고 적지 않는다 —
 * 껐을 때 시스템이 실제로 어디서 처리했는지는 공개 API가 답하지 않는다. 모르는 것을
 * 안다고 적으면 다음 사람이 그 값을 근거로 네트워크 의존을 판정한다.
 */
export type SpeechOnDevice = "guaranteed" | "not-guaranteed";

/**
 * `start`의 콜백이 **세션이 끝날 때 정확히 한 번** 싣고 오는 것.
 *
 * 온디바이스 축이 **넷 다 남는다** — `requestedOnDevice`(우리가 요청한 것) ·
 * `supportsOnDevice`(기기가 할 수 있는 것) · `requiresOnDevice`(실제로 세운 것) ·
 * `onDevice`(그 결론). 넷을 하나로 줄이면 「요청을 안 했다」와 「요청했는데 기기가 못
 * 한다」가 같은 값이 되고, 조용한 서버 인식이 이 탐침의 관찰 대상이라 그 갈림이 곧
 * 물음 자체다.
 */
export type SpeechResult = {
  readonly status: SpeechResultStatus;
  /** ⭐ **빈 문자열도 유효한 값이다.** 듣고도 못 읽은 것은 오류가 아니라 관측이다. */
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

/** `start`에 넘길 것. 네이티브가 읽는 키가 이것뿐이다. */
export type SpeechStartOptions = {
  /** 생략하면 네이티브의 기본(켬)이다 — 기본값을 여기서 다시 적지 않는다. */
  readonly requireOnDevice?: boolean;
};

/**
 * **요청 한 번의 결과**다. 권한 상태도 인식 결과도 아니고, ADR-0026 D3 **1단계의
 * 답**이다 — 접점이 있어서 요청이 건너갔는가.
 *
 * boolean이 아니라 union인 이유는 `audio.ts`·`handwriting-recognition.ts`와 같다 —
 * `true`가 호출자마다 다른 뜻으로 읽힌다.
 */
export type SpeechRequestOutcome = "requested" | "unavailable";

// **`storage.ts`·`audio.ts`·`handwriting-recognition.ts`와 같은 형태다 — `typeof` 가드 +
// `null` 가드 + 모듈 값 `null` 정규화.**
//
// `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이 **아예 없다.** 가드 없이
// 맨 식별자에 손대면 `ReferenceError: NativeModules is not defined`가 나고, 이 접점은
// 탐침 화면이 렌더될 때부터 불리므로 그 계층이 통째로 죽는다. 메인 스레드에서는 같은
// 전역이 `undefined`라, 이 가드가 「호스트가 아닌 곳」과 「메인 스레드」를 같은 경로로
// 보낸다 — 어느 쪽이든 조용히 듣지 않는 것이 정상이다 (ADR-0017 D3 · ADR-0026 D3의
// 「능력 부재」 행).
//
// `typeof NativeModules === "undefined"`는 전역이 **없을 때**만 막는다. `typeof null`은
// `"object"`라 전역 자체가 `null`이면 그 가드를 통과하고 바로 아래 색인 접근에서
// TypeError가 난다. `NativeModules === null` 줄이 그 사각을 닫는다.
//
// export 전부가 이 함수 하나를 지난다 — 없을 때 조용한 것이 여러 자리에 흩어져 있으면
// 한 자리만 고칠 수 있다. 그리고 그 하나가 곧 D3 1단계의 유일한 판정 자리다.
function nativeModule(): SpeechRecognitionModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["SpeechRecognitionModule"] as
    | SpeechRecognitionModule
    | undefined;
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰된다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화한다.
  return module ?? undefined;
}

/**
 * 호스트에 이 모듈이 있는가 — **ADR-0026 D3의 1단계**다. 부수효과가 없다.
 *
 * `isAudioAvailable`·`isStorageAvailable`과 같은 자리이고, 제품 화면은 이것으로 UI를
 * 가르지 않는다. **탐침 화면은 이 값을 관찰값으로 낸다** — 1단계에서 끝났다는 것이
 * 보이지 않으면 사람이 「권한이 비어 있다」와 「물을 자리가 없었다」를 가르지 못한다.
 * 가르는 데 쓰는 것이 아니라 보이는 데 쓰는 것이라 위의 규약을 넓히지 않는다.
 */
export function isSpeechRecognitionAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * 지금 상태를 읽는다. **다이얼로그를 띄우지 않는다** (ADR-0026 D5의 조회/요청 분리).
 * 던지지 않는다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려준다 — **`onStatus`도 부르지
 * 않는다.** 1단계에서 끝난 것을 2단계의 값으로 흉내 내면(예: 권한 전부 `"unknown"`인
 * 상태를 지어서 올리면) 두 단계가 한 값으로 뭉친다.
 */
export function getSpeechStatus(onStatus: (status: SpeechStatus) => void): SpeechRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  host.getStatus((payload) => onStatus(speechStatus(payload)));

  return "requested";
}

/**
 * 권한을 요청한다. 네이티브가 **미요청인 것에만** 묻는다 (ADR-0026 D5) — 거부된 권한에
 * 다시 묻는 것은 사용자 눈에 아무 일도 안 일어난 것으로 보이고, 그 자리의 처방은 요청이
 * 아니라 설정 열기다.
 *
 * 돌려주는 모양이 `getSpeechStatus`와 **같다.** 받는 쪽이 모양 하나만 알면 된다.
 *
 * **재시도 수단으로 쓰지 말라는 것을 이 파일이 막지 않는다.** 막으려면 「거부면 부르지
 * 않는다」를 여기서 판정해야 하고, 그것이 곧 거부 조합의 처방이다. 부를 때를 고르는
 * 자리는 화면이다.
 */
export function requestSpeechPermissions(
  onStatus: (status: SpeechStatus) => void,
): SpeechRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  host.requestPermissions((payload) => onStatus(speechStatus(payload)));

  return "requested";
}

/**
 * 녹음과 인식을 시작한다. 던지지 않는다. `onResult`는 **세션이 끝날 때 정확히 한 번**
 * 올라간다 — 시작하지 못한 경우에도 같은 콜백이 같은 모양으로 즉시 올라간다.
 *
 * **세대(generation) 카운터를 두지 않는다.** `audio.ts`가 그것을 든 이유는 새 `play`가
 * 이전 것을 대체해서였는데, 여기에는 대체 규약이 없다 — 돌고 있는 중에 다시 시작하면
 * 네이티브가 `"already-listening"`으로 답하므로 콜백과 요청이 짝을 잃는 경로가 없다.
 * 연타 방어는 화면의 지역 상태가 진다.
 */
export function startSpeechRecognition(
  options: SpeechStartOptions,
  onResult: (result: SpeechResult) => void,
): SpeechRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  // 값이 없을 때 **키를 만들지 않는다.** 네이티브는 키의 부재(기본값 적용)와 키가 있는데
  // 모양이 다른 것(`"invalid-arguments"`)을 가르는데, `{ requireOnDevice: undefined }`가
  // 브리지에서 무엇으로 굳는지는 우리가 정하지 못한다. 만들지 않으면 그 갈림에 안 걸린다.
  const args: Record<string, unknown> =
    options.requireOnDevice === undefined ? {} : { requireOnDevice: options.requireOnDevice };

  host.start(args, (payload) => onResult(speechResult(payload)));

  return "requested";
}

/**
 * 녹음을 멈춘다. 모듈이 없어도 던지지 않는다.
 *
 * **콜백이 없다** — 멈춘 뒤에도 인식기가 마지막 버퍼를 읽어 결과를 확정하므로, 결과는
 * `startSpeechRecognition`의 콜백이 그 확정 시점에 싣는다. 결과를 싣는 자리가 둘이면
 * 어느 쪽이 정본인지 다투게 된다.
 */
export function stopSpeechRecognition(): void {
  const host = nativeModule();
  if (host === undefined) {
    return;
  }

  host.stop();
}

// ------------------------------------------------------------------ 페이로드 읽기

// 브리지를 건너온 값은 `[String: Any]`가 풀린 `unknown`이라 모양을 믿지 않는다.
// 읽는 자리를 아래 넷으로 모은다 — 열여섯 개 키를 각자 방어하면 같은 판단이 열여섯 벌이
// 되고, 한 벌만 고쳐지는 날이 온다.

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

// `NaN`·`Infinity`를 0으로 접는다 — 화면이 그대로 글자로 내는 값이고, 그 글자가 실기
// 기록에 남기 때문이다. 읽을 수 없는 수는 읽을 수 없는 수로 남기지 않고 0으로 모은다.
function numberField(payload: unknown, key: string): number {
  const value = field(payload, key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * 권한 상태 하나를 정규화한다. 아는 낱말이면 그대로, 아니면 `"unknown"`이다.
 *
 * ⚠ **`restricted`를 `denied`로 접지 않는다** — 위 `SpeechPermissionState` 주석의 근거
 * 그대로다. 접는 코드가 없다는 것이 이 함수의 요점이라, 아는 낱말을 목록으로 두고
 * 목록에 있으면 손대지 않는다.
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
 * 상태 페이로드를 타입 있는 모양으로 올린다. 던지지 않는다.
 *
 * 페이로드가 아예 어그러졌을 때 따로 상태 값을 만들지 않는다 — 권한 둘이 `"unknown"`이고
 * 나머지가 비어 있는 것이 그 자체로 「읽을 것이 없었다」를 말한다. 상태 조회에는 결과
 * 쪽의 `status` 같은 축이 없어서, 없는 축을 지어내면 화면이 그 값을 또 갈라야 한다.
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
 * 결과 페이로드를 타입 있는 모양으로 올린다. 던지지 않는다.
 *
 * **키마다 따로 읽는다** — 페이로드 하나가 통째로 `malformed`가 되지 않는다. 열여섯 개
 * 키 중 하나가 어그러졌다고 나머지 열다섯을 버리면 탐침이 볼 수 있었던 것을 스스로
 * 지우는 셈이다. 읽히지 않은 키는 그 자리의 빈 값으로 남고, `status`가 아는 낱말이
 * 아니었다는 것은 `"malformed"`가 말한다.
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
    // 아는 낱말 하나만 `"guaranteed"`로 올린다. 모르는 값을 보장으로 읽으면 **없는
    // 보장을 있다고 적는 것**이라, 접는 방향을 보수적인 쪽으로 고정한다. 날것이 필요한
    // 자리는 위의 `requiresOnDevice`가 그대로 답한다.
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
