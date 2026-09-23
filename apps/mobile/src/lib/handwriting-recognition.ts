// 손글씨 인식 접점입니다. 호스트 앱의 `HandwritingRecognitionModule`을 감쌉니다.
// 접점은 모듈마다 파일 하나입니다(ADR-0017 D3). 화면은 `NativeModules`를 직접
// 만지지 않습니다.
//
// 획 좌표 타입(`StrokePoint` · `Stroke`)이 여기 사는 이유는 의존 방향입니다 —
// `src/lib/`는 화면 무관 어휘가 사는 곳이고 `src/screens/`가 그것을 가져다 씁니다.
// 반대로 두면 접점이 화면 폴더를 import하게 되는데, 저장소에 그 방향의 선례가
// 없습니다.
//
// 전역 `NativeModules` 가드와 결선은 이 모듈의 유일한 부수효과 지점이라 integration
// 계층이 집니다. 순수 함수인 페이로드 파서만 unit이 집니다.

/** 표면 좌표 하나입니다. 단위는 표면 로컬 point입니다. */
export type StrokePoint = { readonly x: number; readonly y: number };

/** 획 하나 — 손가락이 닿아서 떨어질 때까지 모인 점들입니다. 순서가 의미를 집니다. */
export type Stroke = readonly StrokePoint[];

/** 호스트가 `HandwritingRecognitionModule`이라는 이름으로 등록합니다. */
interface HandwritingRecognitionModule {
  recognize(args: HandwritingReadRequest, callback: (result: unknown) => void): void;
}

/** 넘길 것입니다. Swift 쪽 표와 키·타입이 1:1입니다. */
export type HandwritingReadRequest = {
  readonly width: number;
  readonly height: number;
  readonly strokeWidth: number;
  readonly strokes: readonly Stroke[];
};

/** 인식 **한 번의 결과**입니다. 모듈 가용 여부를 답하지 않습니다. */
export type HandwritingReadOutcome =
  | { readonly status: "read"; readonly text: string }
  | { readonly status: "language-unsupported" }
  | { readonly status: "invalid-arguments" }
  | { readonly status: "failed" }
  | { readonly status: "malformed" }; // JS 쪽에서만 생깁니다

/** 요청 **한 번의 결과**입니다. boolean이 아닌 이유는 `audio.ts`와 같습니다. */
export type HandwritingReadRequestOutcome = "requested" | "unavailable";

// **`storage.ts`·`audio.ts`·`accessibility.ts`와 같은 형태입니다 — `typeof` 가드 +
// `null` 정규화.** `lynx.getJSModule`을 쓰지 않습니다.
//
// `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이 **아예 없습니다.** 가드
// 없이 맨 식별자에 손대면 `ReferenceError: NativeModules is not defined`가 납니다.
// 이 접점은 화면의 「읽기」에서 불리므로, 가드가 없으면 탐침이 관찰하려던 것 대신
// 예외가 관찰됩니다. 메인 스레드에서는 같은 전역이 `undefined`라, 이 가드가
// 「호스트가 아닌 곳」과 「메인 스레드」를 같은 경로로 보냅니다 — 어느 쪽이든
// 조용히 읽지 않는 것이 정상입니다.
//
// `typeof NativeModules === "undefined"`는 전역이 **없을 때**만 막습니다. `typeof null`은
// `"object"`라 전역 자체가 `null`이면 그 가드를 통과하고 바로 아래 색인 접근에서
// TypeError가 납니다. `NativeModules === null` 줄이 그 사각을 닫습니다.
//
// 두 export가 이 함수 하나를 지납니다 — 없을 때 조용한 것이 두 자리에 흩어져 있으면
// 한 자리만 고칠 수 있습니다.
function nativeModule(): HandwritingRecognitionModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["HandwritingRecognitionModule"] as
    | HandwritingRecognitionModule
    | undefined;
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰됩니다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화합니다.
  return module ?? undefined;
}

/**
 * 호스트에 이 모듈이 있는가입니다. 없으면 `false`이고 부수효과가 없습니다.
 *
 * **화면은 이것으로 UI를 가르지 않습니다** — 소비자는 테스트와 사람이고,
 * `isAudioAvailable`·`isStorageAvailable`과 같은 자리입니다.
 */
export function isHandwritingRecognitionAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * 획들을 호스트에 넘겨 인식을 요청합니다. 던지지 않습니다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려줍니다 — **`onResult`도
 * 부르지 않습니다.** 「요청이 갔는가」와 「결과가 무엇인가」는 다른 물음이라 다른
 * 값이 답합니다. 그래서 `HandwritingReadOutcome`에 `"unavailable"` 멤버가 없습니다.
 *
 * **세대(generation) 카운터를 두지 않습니다.** `audio.ts`가 그것을 든 이유는
 * 취소 수단(`stop`)이 있고 새 `play`가 이전 것을 대체해서입니다 — 여기에는
 * 취소 수단도 대체 규약도 없고, 요청 하나에 콜백 하나라 둘이 짝을 잃는 경로가
 * 없습니다. 연타는 화면의 「요청 중」 지역 상태가 막습니다.
 *
 * 콜백이 실어 온 값은 브리지를 건너온 `unknown`이라 **파서 하나를 통과시킵니다**
 * — 믿을 수 없는 입력을 두 자리에서 풀면 어느 쪽이 정본인지 갈립니다.
 */
export function readHandwriting(
  request: HandwritingReadRequest,
  onResult: (outcome: HandwritingReadOutcome) => void,
): HandwritingReadRequestOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  host.recognize(request, (result) => onResult(handwritingReadOutcome(result)));

  return "requested";
}

/**
 * 네이티브 콜백이 실어 보낸 값을 결과 union으로 바꿉니다. 던지지 않습니다.
 *
 * 들어오는 값은 브리지를 건너온 `unknown`이라 모양을 믿지 않습니다. 아는 이름의
 * 모양만 그대로 남기고, 그 밖은 전부 `malformed`로 떨어집니다.
 */
export function handwritingReadOutcome(payload: unknown): HandwritingReadOutcome {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { status: "malformed" };
  }

  const status = (payload as Record<string, unknown>)["status"];

  if (status === "read") {
    const text = (payload as Record<string, unknown>)["text"];

    // ⭐ 「빈 문자열을 읽었다」는 `failed`가 아닙니다. Vision이 돌았는데 관측이 0건인
    // 것과 경로가 아예 안 선 것은 다음에 할 일이 완전히 다릅니다 — 앞엣것은 인식
    // 품질(배율·굵기·글자 크기)을 손볼 일이고 뒤엣것은 결선을 손볼 일입니다. 빈
    // 문자열을 실패로 접으면 그 갈림이 기록에서 사라져 탐침이 답을 못 냅니다. 다만
    // `text` 자리가 비거나 문자열이 아니면 「읽었다」가 아니라 모양이 어그러진
    // 것입니다.
    return typeof text === "string" ? { status: "read", text } : { status: "malformed" };
  }

  if (status === "language-unsupported") {
    return { status: "language-unsupported" };
  }

  if (status === "invalid-arguments") {
    return { status: "invalid-arguments" };
  }

  if (status === "failed") {
    return { status: "failed" };
  }

  return { status: "malformed" };
}
