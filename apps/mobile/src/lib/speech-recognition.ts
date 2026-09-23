// 말하기 인식 접점입니다. 호스트 앱의 `SpeechRecognitionModule`을 감쌉니다. 접점은
// 모듈마다 파일 하나입니다(ADR-0017 D3) — 화면은 `NativeModules`를 직접 만지지
// 않습니다. 이름은 선례 규약 그대로입니다: 감싸는 모듈 이름을 케밥으로 적습니다
// (`handwriting-recognition.ts`가 `HandwritingRecognitionModule`을 감싸는 것과
// 같습니다).
//
// **이 파일이 지는 것 — 2단계 판별입니다.**
// 1. **접점이 있는가.** `typeof NativeModules` 가드가 답합니다. 없으면 **거기서
//    끝입니다** — 권한 상태를 물을 자리조차 없습니다. 상태를 답하는 것이 그
//    모듈이기 때문입니다. 이 구조가 코드에 드러나도록, 상태를 나르는 함수들이
//    전부 **반환값**으로 1단계를 답하고 **콜백**으로 2단계를 나릅니다. 반환값이
//    `"unavailable"`이면 콜백은 오지 않습니다.
// 2. **있으면 모듈이 답하는 권한 상태를 읽습니다.** 그 값이
//    `speech-recognition-types.ts`의 `SpeechStatus`입니다.
//
// **이 파일이 정하지 않는 것 — 거부 조합의 처방 전부입니다.**
// 「마이크 허용 · 인식 거부」일 때 무엇을 해야 하는지, 어느 조합에서 진행을 막고
// 어느 조합에서 설정으로 보내는지를 여기서 정하지 않습니다. 상태 둘을 **각각
// 있는 그대로** 올릴 뿐입니다. 조합을 「진행 가능/불가」 불리언 하나로 뭉개는
// 함수를 두지 않는 것이 이 파일의 결정입니다 — 뭉개면 탐침이 관찰하려는
// 갈림(조합마다 사람이 할 일이 다릅니다)이 값에서 사라지고, 그 처방을 고른
// 자리가 접점 파일이 되어 버립니다. 고르는 자리는 화면입니다.

import type {
  SpeechRecognitionModule,
  SpeechRequestOutcome,
  SpeechResult,
  SpeechStartOptions,
  SpeechStatus,
} from "./speech-recognition-types";
import { speechResult, speechStatus } from "./speech-recognition-payload";

export type {
  SpeechOnDevice,
  SpeechPermissionState,
  SpeechRequestOutcome,
  SpeechResult,
  SpeechResultStatus,
  SpeechStartOptions,
  SpeechStatus,
} from "./speech-recognition-types";
export { speechPermissionState, speechResult, speechStatus } from "./speech-recognition-payload";

// **`storage.ts`·`audio.ts`·`handwriting-recognition.ts`와 같은 형태입니다 —
// `typeof` 가드 + `null` 가드 + 모듈 값 `null` 정규화.**
//
// `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이 **아예 없습니다.**
// 가드 없이 맨 식별자에 손대면 `ReferenceError: NativeModules is not defined`가
// 나고, 이 접점은 탐침 화면이 렌더될 때부터 불리므로 그 계층이 통째로 죽습니다.
// 메인 스레드에서는 같은 전역이 `undefined`라, 이 가드가 「호스트가 아닌 곳」과
// 「메인 스레드」를 같은 경로로 보냅니다 — 어느 쪽이든 조용히 듣지 않는 것이
// 정상입니다.
//
// `typeof NativeModules === "undefined"`는 전역이 **없을 때**만 막습니다. `typeof null`은
// `"object"`라 전역 자체가 `null`이면 그 가드를 통과하고 바로 아래 색인 접근에서
// TypeError가 납니다. `NativeModules === null` 줄이 그 사각을 닫습니다.
//
// export 전부가 이 함수 하나를 지납니다 — 없을 때 조용한 것이 여러 자리에
// 흩어져 있으면 한 자리만 고칠 수 있습니다. 그리고 그 하나가 곧 위 1단계의
// 유일한 판정 자리입니다.
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
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰됩니다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화합니다.
  return module ?? undefined;
}

/**
 * 호스트에 이 모듈이 있는가 — **1단계**입니다. 부수효과가 없습니다.
 *
 * `isAudioAvailable`·`isStorageAvailable`과 같은 자리이고, 제품 화면은 이것으로
 * UI를 가르지 않습니다. **탐침 화면은 이 값을 관찰값으로 냅니다** — 1단계에서
 * 끝났다는 것이 보이지 않으면 사람이 「권한이 비어 있다」와 「물을 자리가
 * 없었다」를 가르지 못합니다. 가르는 데 쓰는 것이 아니라 보이는 데 쓰는
 * 것이라 위의 규약을 넓히지 않습니다.
 */
export function isSpeechRecognitionAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * 지금 상태를 읽습니다. **다이얼로그를 띄우지 않습니다**(조회/요청 분리).
 * 던지지 않습니다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려줍니다 — **`onStatus`도
 * 부르지 않습니다.** 1단계에서 끝난 것을 2단계의 값으로 흉내 내면(예: 권한
 * 전부 `"unknown"`인 상태를 지어서 올리면) 두 단계가 한 값으로 뭉칩니다.
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
 * 권한을 요청합니다. 네이티브가 **미요청인 것에만** 묻습니다 — 거부된 권한에
 * 다시 묻는 것은 사용자 눈에 아무 일도 안 일어난 것으로 보이고, 그 자리의
 * 처방은 요청이 아니라 설정 열기입니다.
 *
 * 돌려주는 모양이 `getSpeechStatus`와 **같습니다.** 받는 쪽이 모양 하나만 알면
 * 됩니다.
 *
 * **재시도 수단으로 쓰지 말라는 것을 이 파일이 막지 않습니다.** 막으려면
 * 「거부면 부르지 않는다」를 여기서 판정해야 하고, 그것이 곧 거부 조합의
 * 처방입니다. 부를 때를 고르는 자리는 화면입니다.
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
 * 녹음과 인식을 시작합니다. 던지지 않습니다. `onResult`는 **세션이 끝날 때
 * 정확히 한 번** 올라갑니다 — 시작하지 못한 경우에도 같은 콜백이 같은 모양으로
 * 즉시 올라갑니다.
 *
 * **세대(generation) 카운터를 두지 않습니다.** `audio.ts`가 그것을 든 이유는
 * 새 `play`가 이전 것을 대체해서였는데, 여기에는 대체 규약이 없습니다 — 돌고
 * 있는 중에 다시 시작하면 네이티브가 `"already-listening"`으로 답하므로
 * 콜백과 요청이 짝을 잃는 경로가 없습니다. 연타 방어는 화면의 지역 상태가
 * 집니다.
 */
export function startSpeechRecognition(
  options: SpeechStartOptions,
  onResult: (result: SpeechResult) => void,
): SpeechRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  // 값이 없을 때 **키를 만들지 않습니다.** 네이티브는 키의 부재(기본값 적용)와
  // 키가 있는데 모양이 다른 것(`"invalid-arguments"`)을 가르는데,
  // `{ requireOnDevice: undefined }`가 브리지에서 무엇으로 굳는지는 우리가
  // 정하지 못합니다. 만들지 않으면 그 갈림에 안 걸립니다.
  const args: Record<string, unknown> =
    options.requireOnDevice === undefined ? {} : { requireOnDevice: options.requireOnDevice };

  host.start(args, (payload) => onResult(speechResult(payload)));

  return "requested";
}

/**
 * 녹음을 멈춥니다. 모듈이 없어도 던지지 않습니다.
 *
 * **콜백이 없습니다** — 멈춘 뒤에도 인식기가 마지막 버퍼를 읽어 결과를
 * 확정하므로, 결과는 `startSpeechRecognition`의 콜백이 그 확정 시점에 싣습니다.
 * 결과를 싣는 자리가 둘이면 어느 쪽이 정본인지 다투게 됩니다.
 */
export function stopSpeechRecognition(): void {
  const host = nativeModule();
  if (host === undefined) {
    return;
  }

  host.stop();
}
