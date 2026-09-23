import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { HandwritingProbeScreen } from "./HandwritingProbeScreen";
import { probeStrokeWidth, probeSurfaceSize } from "./handwriting-probe";
import { isHandwritingRecognitionAvailable } from "../../lib/handwriting-recognition";

// `integration` 계층: 실제 모듈들의 협력을 한 트리에서 봅니다(ADR-0006 D4). 여기서
// 맞물리는 것은 화면·`DrawingSurface`·`lib/handwriting-recognition.ts`의 접점·전역
// `NativeModules`입니다. **모듈이 없을 때 던지지 않는가**는 고립 렌더로 볼 수
// 없습니다 — 접점과 화면이 같은 트리에 서야 비로소 관측됩니다.
//
// ⚠ **integration 파일이 `src/app/` 밖에 있는 첫 사례입니다.** 기존 아홉은 전부
// App에 뿌리내리는데, 이 탐침은 **App에서 도달 불가라는 것이 정의**라 App을
// 무대로 쓰면 그 정의를 깨야 합니다. 계층은 파일명이 가르고 테스트는 소스 옆에
// 둡니다(ADR-0006 D4·D7).
//
// ⚠ **`vi.stubGlobal("NativeModules", …)`은 전역을 통째로 갈아치웁니다.** 한
// 모듈만 세우면 나머지가 사라지므로, 여러 모듈을 쓰는 파일에서는 `stubGlobal`
// 하나에 모두 담아야 합니다(`App.integration.test.tsx`의 같은 이름 헬퍼가 그
// 형태입니다). **이 파일은 안전합니다** — 이 화면의 트리는
// `announceCompletion`·`storage`·`audio` 어느 접점도 부르지 않고, 손글씨 모듈
// 하나만 만집니다.
//
// 목킹하지 않습니다 — 대역을 두는 자리는 **호스트 경계 하나**입니다.
// `lib/handwriting-recognition.ts`를 `vi.mock`하면 이 계층이 보기로 한 경계가
// 통째로 사라집니다.

type RecognizeCall = {
  readonly args: unknown;
  readonly callback: (result: unknown) => void;
};

// 네이티브가 실제로 하는 일(래스터화·Vision)은 이 계층의 관심이 아닙니다. 여기서
// 보는 것은 **무엇이 건너갔고 무엇이 돌아왔을 때 화면이 어떻게 되는가**뿐이라,
// 대역은 인자를 적어 두고 콜백을 테스트 손에 쥐여 줍니다 — 콜백을 언제 부를지가
// 곧 케이스입니다.
function stubHost(): RecognizeCall[] {
  const calls: RecognizeCall[] = [];
  vi.stubGlobal("NativeModules", {
    HandwritingRecognitionModule: {
      recognize: (args: unknown, callback: (result: unknown) => void) => {
        calls.push({ args, callback });
      },
    },
  });
  return calls;
}

// 전역 대역을 **케이스마다 원상복구합니다.** 지우지 않으면 대역이 다른 파일로
// 새고, 전역이 없는 것을 전제로 도는 케이스들이 먼저 빨개집니다.
afterEach(() => {
  vi.unstubAllGlobals();
});

// 표면에 획 하나를 긋습니다. 점 좌표를 정수로 쓰는 이유는 IG7이 **화면이 모은
// 좌표 그대로**를 건너편에서 다시 찾기 때문입니다 — 렌더용 반올림과 섞이면
// 무엇을 보고 있는지 흐려집니다.
function drawStroke(points: readonly { readonly x: number; readonly y: number }[]): void {
  const surface = screen.getByTestId("drawing-surface");
  const [first, ...rest] = points;

  fireEvent.touchstart(surface, { touches: [first] });
  for (const point of rest) {
    fireEvent.touchmove(surface, { touches: [point] });
  }
  fireEvent.touchend(surface, {});
}

function tapRead(): void {
  fireEvent.tap(screen.getByTestId("handwriting-probe-screen-read"), {});
}

const resultLine = (): HTMLElement => screen.getByTestId("handwriting-probe-screen-result");

// ------------------------------------------------------------------------- IG1

test("[IG1] 모듈이 있고 read 페이로드가 돌아오면 결과 줄이 그 status와 글자를 싣는다", () => {
  const calls = stubHost();
  render(<HandwritingProbeScreen />);

  // 접점이 전역에서 핸들을 실제로 찾는다는 앵커입니다. 이것이 거짓이면 아래
  // 단언들이 「모듈이 없어서」 통과하는지 「있어서」 통과하는지 갈리지 않습니다.
  expect(isHandwritingRecognitionAvailable()).toBe(true);

  drawStroke([{ x: 10, y: 20 }]);
  tapRead();

  expect(calls).toHaveLength(1);

  // Swift 쪽 페이로드를 글자 그대로 흉내 냅니다 — 키 둘, 값 둘 다 문자열입니다.
  act(() => calls[0].callback({ status: "read", text: "한" }));

  expect(resultLine()).toHaveAttribute("data-status", "read");
  expect(resultLine()).toHaveTextContent("한");
});

// ------------------------------------------------------------------------- IG2

test("[IG2] 전역은 있는데 모듈 키가 없으면 읽기가 던지지 않고 결과 줄이 unavailable로 선다", () => {
  const calls: RecognizeCall[] = [];
  // 전역은 섰고 이 모듈만 없습니다 — 등록 줄이 빠졌거나 이름이 어긋난 모양입니다.
  vi.stubGlobal("NativeModules", {});
  render(<HandwritingProbeScreen />);

  expect(isHandwritingRecognitionAvailable()).toBe(false);

  drawStroke([{ x: 1, y: 2 }]);
  expect(() => tapRead()).not.toThrow();

  // 「요청이 갔는가」와 「결과가 무엇인가」는 다른 물음이고 다른 값이 답합니다.
  // 요청이 안 갔다는 사실이 결과 줄에 서지 않으면 사람이 실기에서 침묵과
  // 구분하지 못합니다.
  expect(resultLine()).toHaveAttribute("data-status", "unavailable");
  expect(resultLine().textContent).toBe("");
  expect(calls).toHaveLength(0);
});

// ------------------------------------------------------------------------- IG3

test("[IG3] 전역이 아예 없어도 렌더와 읽기가 ReferenceError 없이 지나간다", () => {
  // 앵커입니다 — 전역이 실제로 없다는 것을 먼저 박습니다. 있으면 이 케이스가
  // IG2의 복사본이 되어 **다른 실패 모양**을 못 봅니다. 맨 식별자 접근이
  // `ReferenceError`를 던지는 것이 이 환경의 사실이고, `typeof` 가드가 막는 것이
  // 바로 그것입니다.
  expect("NativeModules" in globalThis).toBe(false);

  expect(() => render(<HandwritingProbeScreen />)).not.toThrow();
  expect(() => isHandwritingRecognitionAvailable()).not.toThrow();
  expect(isHandwritingRecognitionAvailable()).toBe(false);

  drawStroke([{ x: 3, y: 4 }]);
  expect(() => tapRead()).not.toThrow();

  expect(resultLine()).toHaveAttribute("data-status", "unavailable");
});

// ------------------------------------------------------------------------- IG4

test("[IG4] read + 빈 문자열은 read로 남고 failed와 화면에서 갈린다", () => {
  const calls = stubHost();
  render(<HandwritingProbeScreen />);

  drawStroke([{ x: 5, y: 5 }]);
  tapRead();
  act(() => calls[0].callback({ status: "read", text: "" }));

  // ⭐ 계약의 핵심 결정이 화면에서도 보이는가입니다. Vision이 돌았는데 관측이
  // 0건인 것과 경로가 안 선 것은 다음에 할 일이 완전히 다릅니다 — 앞엣것은 인식
  // 품질을, 뒤엣것은 결선을 손볼 일입니다. 두 값이 같은 글자로 보이면 탐침이
  // 답을 못 냅니다.
  expect(resultLine()).toHaveAttribute("data-status", "read");
  expect(resultLine().textContent).toBe("");
  expect(resultLine().getAttribute("data-status")).not.toBe("unavailable");

  // 같은 화면에서 한 번 더 읽어 `failed`를 받습니다. 본문은 **둘 다 빈
  // 문자열**이라 갈리는 자리는 `data-status` 하나뿐이고, 그래서 그 자리를
  // 여기서 겁니다.
  tapRead();
  act(() => calls[1].callback({ status: "failed", text: "" }));

  expect(resultLine()).toHaveAttribute("data-status", "failed");
  expect(resultLine().textContent).toBe("");
});

// ------------------------------------------------------------------------- IG5

test("[IG5] language-unsupported가 그대로 결과 줄에 선다", () => {
  const calls = stubHost();
  render(<HandwritingProbeScreen />);

  drawStroke([{ x: 7, y: 8 }]);
  tapRead();
  act(() => calls[0].callback({ status: "language-unsupported", text: "" }));

  // 이 값 자체가 Q3의 답입니다 — `failed`로 접으면 「지원이 없었다」가 사라집니다.
  expect(resultLine()).toHaveAttribute("data-status", "language-unsupported");
  expect(resultLine().textContent).toBe("");
});

// ------------------------------------------------------------------------- IG6

test("[IG6] 페이로드가 어그러져도 던지지 않고 malformed로 선다", () => {
  const calls = stubHost();
  render(<HandwritingProbeScreen />);

  drawStroke([{ x: 9, y: 9 }]);
  tapRead();

  // 브리지를 건너온 값은 `unknown`이라 모양을 믿지 않습니다. 접점이 파서를 **통과
  // 시키는지**가 여기서 드러납니다 — 통과시키지 않으면 화면이 `null.status`에서
  // 죽습니다.
  expect(() => act(() => calls[0].callback(null))).not.toThrow();

  expect(resultLine()).toHaveAttribute("data-status", "malformed");
  expect(resultLine().textContent).toBe("");
});

// ------------------------------------------------------------------------- IG7

test("[IG7] recognize가 받는 인자가 계약의 키 넷이고 strokes가 모은 좌표와 같은 순서다", () => {
  const calls = stubHost();
  render(<HandwritingProbeScreen />);

  drawStroke([
    { x: 10, y: 11 },
    { x: 12, y: 13 },
  ]);
  drawStroke([{ x: 20, y: 21 }]);
  tapRead();

  expect(calls).toHaveLength(1);

  // 키가 **정확히 넷**입니다. 하나라도 더 넘기면 Swift 쪽 `parse`가 읽지 않는
  // 값이 계약에 들어와 다음 사람이 어느 쪽이 정본인지 고르게 됩니다.
  expect(Object.keys(calls[0].args as Record<string, unknown>).sort()).toEqual([
    "height",
    "strokeWidth",
    "strokes",
    "width",
  ]);

  // 값의 정본은 상수입니다 — 리터럴(300·6)을 적으면 이 파일이 두 번째 정본이
  // 됩니다.
  expect(calls[0].args).toEqual({
    width: probeSurfaceSize.width,
    height: probeSurfaceSize.height,
    strokeWidth: probeStrokeWidth,
    strokes: [
      [
        { x: 10, y: 11 },
        { x: 12, y: 13 },
      ],
      [{ x: 20, y: 21 }],
    ],
  });

  // 좌표가 수로 건너갑니다. 문자열로 굳으면 Swift의 `as? NSNumber`가 `nil`을 내고
  // 모든 요청이 `invalid-arguments`로 돌아옵니다 — 실기에서만 드러날 어긋남입니다.
  const strokes = (calls[0].args as { strokes: readonly (readonly { x: unknown }[])[] }).strokes;
  expect(typeof strokes[0][0].x).toBe("number");
});

// ------------------------------------------------------------------------- IG8

test("[IG8] 요청 중 연타는 요청을 늘리지 않고, 결과가 오면 다시 열린다", () => {
  const calls = stubHost();
  render(<HandwritingProbeScreen />);

  drawStroke([{ x: 2, y: 3 }]);

  tapRead();
  expect(calls).toHaveLength(1);

  // 연타 방어는 화면의 「요청 중」 지역 상태가 집니다 — 접점에 상태를 두면 진실이
  // 둘이 됩니다. 그 방어가 실제로 서 있는지는 요청 수로만 보입니다.
  tapRead();
  tapRead();
  expect(calls).toHaveLength(1);

  act(() => calls[0].callback({ status: "read", text: "가" }));

  // 잠금이 영구가 아니라는 것도 함께 겁니다 — 열리지 않으면 실기에서 한 번 읽고
  // 앱을 다시 켜야 합니다.
  tapRead();
  expect(calls).toHaveLength(2);
});
