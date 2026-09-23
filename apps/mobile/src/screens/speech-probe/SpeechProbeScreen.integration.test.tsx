import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SpeechProbeScreen } from "./SpeechProbeScreen";
import { isSpeechRecognitionAvailable } from "../../lib/speech-recognition";

// `integration` 계층: 실제 모듈들의 협력을 한 트리에서 봅니다(ADR-0006 D4). 여기서
// 맞물리는 것은 화면·`lib/speech-recognition.ts`의 접점·전역 `NativeModules`입니다.
// **모듈이 없을 때 던지지 않는가**는 고립 렌더로 볼 수 없습니다 — 접점과 화면이
// 같은 트리에 서야 비로소 관측됩니다. 형태의 정본:
// ../handwriting-probe/HandwritingProbeScreen.integration.test.tsx
//
// ⚠ **integration 파일이 `src/app/` 밖에 있는 둘째 사례입니다.** 손글씨 탐침과 같은
// 이유입니다 — 이 탐침은 **App에서 도달 불가라는 것이 정의**라 App을 무대로 쓰면
// 그 정의를 깨야 합니다.
//
// ⚠ **`vi.stubGlobal("NativeModules", …)`은 전역을 통째로 갈아치웁니다.** 이
// 화면의 트리는 말하기 모듈 하나만 만지므로 여기서는 안전합니다.
//
// 목킹하지 않습니다 — 대역을 두는 자리는 **호스트 경계 하나**입니다.
// `lib/speech-recognition.ts`를 `vi.mock`하면 이 계층이 보기로 한 경계가 통째로
// 사라집니다.

type StartCall = {
  readonly args: Record<string, unknown>;
  readonly callback: (payload: unknown) => void;
};

type Host = {
  readonly statusCallbacks: ((payload: unknown) => void)[];
  readonly permissionCallbacks: ((payload: unknown) => void)[];
  readonly startCalls: StartCall[];
  readonly stops: { count: number };
};

// 네이티브가 실제로 하는 일(오디오 세션·SFSpeechRecognizer)은 이 계층의 관심이
// 아닙니다. 여기서 보는 것은 **무엇이 건너갔고 무엇이 돌아왔을 때 화면이 어떻게
// 되는가**뿐이라, 대역은 인자를 적어 두고 콜백을 테스트 손에 쥐여 줍니다 — 콜백을
// 언제 부를지가 곧 케이스입니다.
function stubHost(): Host {
  const host: Host = {
    statusCallbacks: [],
    permissionCallbacks: [],
    startCalls: [],
    stops: { count: 0 },
  };

  vi.stubGlobal("NativeModules", {
    SpeechRecognitionModule: {
      getStatus: (callback: (payload: unknown) => void) => {
        host.statusCallbacks.push(callback);
      },
      requestPermissions: (callback: (payload: unknown) => void) => {
        host.permissionCallbacks.push(callback);
      },
      start: (args: Record<string, unknown>, callback: (payload: unknown) => void) => {
        host.startCalls.push({ args, callback });
      },
      stop: () => {
        host.stops.count += 1;
      },
    },
  });

  return host;
}

// 전역 대역을 **케이스마다 원상복구합니다.** 지우지 않으면 대역이 다른 파일로
// 새고, 전역이 없는 것을 전제로 도는 케이스들이 먼저 빨개집니다.
afterEach(() => {
  vi.unstubAllGlobals();
});

const tap = (testId: string): void => {
  fireEvent.tap(screen.getByTestId(testId), {});
};

// 상태 페이로드의 키 이름은 Swift 쪽 `statusPayload()`를 글자 그대로 흉내 냅니다.
function statusPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    microphone: "granted",
    speechRecognition: "granted",
    recognizerAvailable: true,
    supportsOnDevice: true,
    locale: "ko-KR",
    listening: false,
    bufferCount: 0,
    level: 0,
    peakLevel: 0,
    ...overrides,
  };
}

// 결과 페이로드도 마찬가지로 Swift 쪽 `resultPayload(status:session:)`를 흉내
// 냅니다.
function resultPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "recognized",
    text: "안녕하세요",
    isFinal: true,
    microphone: "granted",
    speechRecognition: "granted",
    requestedOnDevice: true,
    supportsOnDevice: true,
    requiresOnDevice: true,
    onDevice: "guaranteed",
    bufferCount: 40,
    peakLevel: 0.6,
    averageLevel: 0.1,
    durationMs: 1200,
    errorDomain: "",
    errorCode: 0,
    errorMessage: "",
    ...overrides,
  };
}

// ------------------------------------------------------------------------- IS1

test("[IS1] 모듈이 있으면 상태 읽기가 건너가고 권한 둘이 각각 화면에 선다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  // 접점이 전역에서 핸들을 실제로 찾는다는 앵커입니다. 이것이 거짓이면 아래
  // 단언들이 「모듈이 없어서」 통과하는지 「있어서」 통과하는지 갈리지 않습니다.
  expect(isSpeechRecognitionAvailable()).toBe(true);
  expect(screen.getByTestId("speech-probe-screen-capability")).toHaveAttribute(
    "data-available",
    "true",
  );

  tap("speech-probe-screen-refresh");
  expect(host.statusCallbacks).toHaveLength(1);

  act(() =>
    host.statusCallbacks[0](statusPayload({ microphone: "granted", speechRecognition: "denied" })),
  );

  // ⭐ 거부 조합이 화면에서 갈립니다 — 한쪽만 거부된 상태가 두 줄로 따로 보입니다.
  expect(screen.getByTestId("speech-probe-screen-microphone")).toHaveAttribute(
    "data-permission",
    "granted",
  );
  expect(screen.getByTestId("speech-probe-screen-speech-recognition")).toHaveAttribute(
    "data-permission",
    "denied",
  );
  expect(screen.getByTestId("speech-probe-screen-capability")).toHaveAttribute(
    "data-outcome",
    "requested",
  );
});

// ------------------------------------------------------------------------- IS2

test("[IS2] restricted가 denied로 접히지 않고 화면까지 그대로 온다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-refresh");
  act(() =>
    host.statusCallbacks[0](
      statusPayload({ microphone: "denied", speechRecognition: "restricted" }),
    ),
  );

  // ADR-0026 D3: 되돌릴 수 있는 거부와 되돌릴 수 없는 제한은 화면이 할 일이
  // 다릅니다. 두 줄이 같은 글자를 내면 그 갈림이 실기 기록에서 사라집니다.
  const speech = screen.getByTestId("speech-probe-screen-speech-recognition");
  expect(speech).toHaveAttribute("data-permission", "restricted");
  expect(speech.getAttribute("data-permission")).not.toBe("denied");
  expect(screen.getByTestId("speech-probe-screen-microphone")).toHaveAttribute(
    "data-permission",
    "denied",
  );
});

// ------------------------------------------------------------------------- IS3

test("[IS3] 거부 조합에서도 권한 요청 수단이 살아 있고 요청이 건너간다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-refresh");
  act(() => host.statusCallbacks[0](statusPayload({ microphone: "denied" })));

  // ⭐ 화면이 조합을 보고 수단을 감추지 않습니다 — 감추는 것이 곧 거부 조합의
  // 처방이고, 그것은 이 단위가 정하지 않습니다. 미요청인 것에만 묻는 것은
  // 네이티브가 집니다(D5).
  tap("speech-probe-screen-request");
  expect(host.permissionCallbacks).toHaveLength(1);

  act(() =>
    host.permissionCallbacks[0](
      statusPayload({ microphone: "denied", speechRecognition: "not-determined" }),
    ),
  );

  // 요청이 돌려주는 모양이 조회와 같아서 같은 두 줄이 갱신됩니다.
  expect(screen.getByTestId("speech-probe-screen-microphone")).toHaveAttribute(
    "data-permission",
    "denied",
  );
  expect(screen.getByTestId("speech-probe-screen-speech-recognition")).toHaveAttribute(
    "data-permission",
    "not-determined",
  );
});

// ------------------------------------------------------------------------- IS4

test("[IS4] 입력 레벨과 버퍼 수가 화면에 서서 소리가 들어오는 것이 보인다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-refresh");
  act(() =>
    host.statusCallbacks[0](
      statusPayload({ listening: true, bufferCount: 17, level: 0.08, peakLevel: 0.42 }),
    ),
  );

  const level = screen.getByTestId("speech-probe-screen-level");
  expect(level).toHaveAttribute("data-listening", "true");
  expect(level).toHaveAttribute("data-buffers", "17");
  expect(level).toHaveAttribute("data-level", "0.08");
  expect(level).toHaveAttribute("data-peak", "0.42");
});

// ------------------------------------------------------------------------- IS5

test("[IS5] start가 온디바이스 요구를 그대로 실어 보내고 토글이 그 값을 바꾼다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  expect(host.startCalls).toHaveLength(1);
  // 키가 **정확히 하나**입니다. 네이티브가 읽지 않는 값을 넘기면 계약에 두 번째
  // 정본이 생깁니다.
  expect(Object.keys(host.startCalls[0].args)).toEqual(["requireOnDevice"]);
  expect(host.startCalls[0].args).toEqual({ requireOnDevice: true });

  act(() => host.startCalls[0].callback(resultPayload()));

  tap("speech-probe-screen-require-on-device");
  tap("speech-probe-screen-start");

  expect(host.startCalls).toHaveLength(2);
  expect(host.startCalls[1].args).toEqual({ requireOnDevice: false });
});

// ------------------------------------------------------------------------- IS6

test("[IS6] 인식 결과와 상태·오류 필드가 그대로 화면에 선다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  act(() =>
    host.startCalls[0].callback(
      resultPayload({
        status: "recognition-failed",
        text: "안녕",
        isFinal: false,
        errorDomain: "kAFAssistantErrorDomain",
        errorCode: 1110,
        errorMessage: "No speech detected",
      }),
    ),
  );

  const status = screen.getByTestId("speech-probe-screen-status");
  expect(status).toHaveAttribute("data-status", "recognition-failed");
  expect(status).toHaveAttribute("data-final", "false");

  // 오류가 왔어도 그때까지 읽은 글자를 버리지 않는 것이 네이티브의 결정이고,
  // 화면도 버리지 않습니다.
  expect(screen.getByTestId("speech-probe-screen-recognized").textContent).toBe("안녕");

  const error = screen.getByTestId("speech-probe-screen-error");
  expect(error).toHaveAttribute("data-domain", "kAFAssistantErrorDomain");
  expect(error).toHaveAttribute("data-code", "1110");
  expect(error).toHaveTextContent("No speech detected");
});

// ------------------------------------------------------------------------- IS7

test("[IS7] 빈 문자열을 받은 것과 아직 아무것도 안 온 것이 화면에서 갈린다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  const recognized = () => screen.getByTestId("speech-probe-screen-recognized");

  // 안 온 상태입니다 — 본문이 비어 있습니다.
  expect(recognized().textContent).toBe("");
  expect(recognized()).toHaveAttribute("data-received", "no");

  tap("speech-probe-screen-start");
  act(() => host.startCalls[0].callback(resultPayload({ status: "recognized", text: "" })));

  // ⭐ 받은 상태입니다 — **본문은 여전히 비어 있습니다.** 눈으로는 위와 같고,
  // 갈리는 자리는 `data-received` 하나입니다. 빈 문자열을 오류로 접으면 「듣고도
  // 못 읽었다」가 사라집니다.
  expect(recognized().textContent).toBe("");
  expect(recognized()).toHaveAttribute("data-received", "yes");
  expect(recognized()).toHaveAttribute("data-length", "0");
  expect(screen.getByTestId("speech-probe-screen-status")).toHaveAttribute(
    "data-status",
    "recognized",
  );
});

// ------------------------------------------------------------------------- IS8

test("[IS8] 요청한 온디바이스와 보장된 온디바이스가 갈리는 자리가 보인다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  act(() =>
    host.startCalls[0].callback(
      resultPayload({
        requestedOnDevice: true,
        supportsOnDevice: false,
        requiresOnDevice: false,
        onDevice: "not-guaranteed",
      }),
    ),
  );

  // ⭐ 요청은 했는데 기기가 못 한 자리입니다. 넷이 함께 서므로 「요청을 안
  // 했다」와 「요청했는데 기기가 못 한다」가 갈립니다 — 조용한 서버 인식이 이
  // 탐침의 물음입니다.
  const onDevice = screen.getByTestId("speech-probe-screen-on-device");
  expect(onDevice).toHaveAttribute("data-requested", "true");
  expect(onDevice).toHaveAttribute("data-supported", "false");
  expect(onDevice).toHaveAttribute("data-required", "false");
  expect(onDevice).toHaveAttribute("data-ondevice", "not-guaranteed");
  expect(onDevice).toHaveAttribute("data-gap", "true");

  // 요청 자체를 안 한 경우에는 같은 `not-guaranteed`라도 갈림이 없습니다.
  tap("speech-probe-screen-start");
  act(() =>
    host.startCalls[1].callback(
      resultPayload({
        requestedOnDevice: false,
        supportsOnDevice: true,
        requiresOnDevice: false,
        onDevice: "not-guaranteed",
      }),
    ),
  );

  expect(onDevice).toHaveAttribute("data-ondevice", "not-guaranteed");
  expect(onDevice).toHaveAttribute("data-gap", "false");
});

// ------------------------------------------------------------------------- IS9

test("[IS9] 세션 집계가 조회 시점 값과 따로 선다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  act(() =>
    host.startCalls[0].callback(
      resultPayload({ bufferCount: 88, peakLevel: 0.7, averageLevel: 0.12 }),
    ),
  );

  const sessionLevel = screen.getByTestId("speech-probe-screen-result-level");
  expect(sessionLevel).toHaveAttribute("data-buffers", "88");
  expect(sessionLevel).toHaveAttribute("data-peak", "0.7");
  expect(sessionLevel).toHaveAttribute("data-average", "0.12");

  // 조회 줄은 아직 아무것도 안 읽었으므로 비어 있습니다 — 두 줄이 다른 시점을
  // 답합니다.
  expect(screen.getByTestId("speech-probe-screen-level")).toHaveAttribute("data-buffers", "");
});

// ------------------------------------------------------------------------ IS10

test("[IS10] 인식 결과가 후보별 대조 표에 그대로 들어가고 화면이 판정하지 않는다", () => {
  const host = stubHost();
  const { container } = render(<SpeechProbeScreen />);

  const prompt = screen.getByTestId("speech-probe-screen-prompt").textContent ?? "";
  expect(prompt.length).toBeGreaterThan(0);

  tap("speech-probe-screen-start");
  // 제시문을 문자 그대로 되돌려 줍니다 — 어느 후보에서도 둘이 붙는 것이 관찰입니다.
  act(() => host.startCalls[0].callback(resultPayload({ text: prompt })));

  const rows = [...screen.getByTestId("speech-probe-screen-comparisons").children];
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row).toHaveAttribute("data-identical", "true");
  }

  // ⭐ 그래도 화면 어디에도 「맞았다」가 없습니다. `identical`은 관찰값이지
  // 판정이 아닙니다.
  expect(container.textContent).not.toContain("맞");
  expect(container.textContent).not.toContain("정답");
});

// ------------------------------------------------------------------------ IS11

test("[IS11] 문자열 모양이 인식 결과를 따라 갱신된다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  act(() => host.startCalls[0].callback(resultPayload({ text: " 안녕  하세요. " })));

  const shape = screen.getByTestId("speech-probe-screen-shape");
  expect(shape).toHaveAttribute("data-edges", "true");
  expect(shape).toHaveAttribute("data-repeats", "true");
  expect(shape).toHaveAttribute("data-whitespace", "4");
  expect(shape).toHaveTextContent(".");
});

// ------------------------------------------------------------------------ IS12

test("[IS12] 전역은 있는데 모듈 키가 없으면 던지지 않고 unavailable로 선다", () => {
  // 전역은 섰고 이 모듈만 없습니다 — 등록 줄이 빠졌거나 이름이 어긋난 모양입니다.
  vi.stubGlobal("NativeModules", {});
  render(<SpeechProbeScreen />);

  expect(isSpeechRecognitionAvailable()).toBe(false);

  expect(() => tap("speech-probe-screen-refresh")).not.toThrow();
  expect(() => tap("speech-probe-screen-start")).not.toThrow();
  expect(() => tap("speech-probe-screen-stop")).not.toThrow();

  const capability = screen.getByTestId("speech-probe-screen-capability");
  expect(capability).toHaveAttribute("data-available", "false");
  // ADR-0026 D3의 1단계에서 끝났습니다 — 권한 줄이 빈 것이 「물을 자리조차
  // 없었다」이고, 그 사실이 보이지 않으면 사람이 2단계의 침묵과 구분하지
  // 못합니다.
  expect(capability).toHaveAttribute("data-outcome", "unavailable");
  expect(screen.getByTestId("speech-probe-screen-microphone")).toHaveAttribute(
    "data-permission",
    "",
  );
});

// ------------------------------------------------------------------------ IS13

test("[IS13] 전역이 아예 없어도 렌더와 조작이 ReferenceError 없이 지나간다", () => {
  // 앵커입니다 — 전역이 실제로 없다는 것을 먼저 박습니다. 맨 식별자 접근이
  // `ReferenceError`를 던지는 것이 이 환경의 사실이고, `typeof` 가드가 막는 것이
  // 바로 그것입니다.
  expect("NativeModules" in globalThis).toBe(false);

  expect(() => render(<SpeechProbeScreen />)).not.toThrow();
  expect(() => isSpeechRecognitionAvailable()).not.toThrow();
  expect(isSpeechRecognitionAvailable()).toBe(false);

  expect(() => tap("speech-probe-screen-request")).not.toThrow();
  expect(() => tap("speech-probe-screen-start")).not.toThrow();

  expect(screen.getByTestId("speech-probe-screen-capability")).toHaveAttribute(
    "data-outcome",
    "unavailable",
  );
});

// ------------------------------------------------------------------------ IS14

test("[IS14] 결과 페이로드가 어그러져도 던지지 않고 malformed로 선다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");

  // 브리지를 건너온 값은 `unknown`이라 모양을 믿지 않습니다. 접점이 파서를 **통과
  // 시키는지**가 여기서 드러납니다 — 통과시키지 않으면 화면이 `null.status`에서
  // 죽습니다.
  expect(() => act(() => host.startCalls[0].callback(null))).not.toThrow();

  expect(screen.getByTestId("speech-probe-screen-status")).toHaveAttribute(
    "data-status",
    "malformed",
  );
  // 결과는 왔습니다 — 빈 문자열을 받은 것이지 안 온 것이 아닙니다.
  expect(screen.getByTestId("speech-probe-screen-recognized")).toHaveAttribute(
    "data-received",
    "yes",
  );
});

// ------------------------------------------------------------------------ IS15

test("[IS15] 결과를 기다리는 동안 연타는 요청을 늘리지 않고, 결과가 오면 다시 열린다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  expect(host.startCalls).toHaveLength(1);
  expect(screen.getByTestId("speech-probe-screen-start")).toHaveAttribute("data-awaiting", "true");

  // 연타 방어는 화면의 지역 상태가 집니다 — 접점에 두면 진실이 둘이 됩니다.
  tap("speech-probe-screen-start");
  tap("speech-probe-screen-start");
  expect(host.startCalls).toHaveLength(1);

  act(() => host.startCalls[0].callback(resultPayload()));
  expect(screen.getByTestId("speech-probe-screen-start")).toHaveAttribute("data-awaiting", "false");

  tap("speech-probe-screen-start");
  expect(host.startCalls).toHaveLength(2);
});

// ------------------------------------------------------------------------ IS16

test("[IS16] 멈추기는 네이티브 stop을 부르고 기다림을 스스로 풀지 않는다", () => {
  const host = stubHost();
  render(<SpeechProbeScreen />);

  tap("speech-probe-screen-start");
  tap("speech-probe-screen-stop");

  expect(host.stops.count).toBe(1);
  // 멈춘 뒤에도 인식기가 마지막 버퍼를 읽어 결과를 확정합니다 — 그 확정이 오기
  // 전에 잠금을 열면 요청이 겹칩니다.
  expect(screen.getByTestId("speech-probe-screen-start")).toHaveAttribute("data-awaiting", "true");

  act(() => host.startCalls[0].callback(resultPayload({ isFinal: false })));
  expect(screen.getByTestId("speech-probe-screen-start")).toHaveAttribute("data-awaiting", "false");
});
