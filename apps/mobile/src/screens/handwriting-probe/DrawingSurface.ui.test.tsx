import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { DrawingSurface } from "./DrawingSurface";
import { probeSurfaceSize } from "./handwriting-probe";
import type { Stroke } from "../../lib/handwriting-recognition";

// 계약: .agent-harness/work/lib-263/spec.md §2 · §6.2 (가) 갈래의 DS1~DS11.
// 그 뒤의 DS 번호는 계약에서 오지 않고 **판정이 낸 사각을 닫으려고 덧붙인 것**이다 —
// 각 케이스가 자기 자리에서 무엇을 막는지 스스로 적는다.
//
// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 `toBeVisible`·`toHaveStyle`·`toHaveClass`를 쓰지 않는다
// (vitest.setup.ts). 그어진 **픽셀**도 여기서 볼 수 없다 — 판정 대상은 「무엇이 그려
// 졌는가」가 아니라 「무엇이 컴포넌트 상태와 렌더 구조에 반영됐는가」다.
//
// ⚠ **이 파일이 통과해도 실기의 필드 이름이 맞다는 보장이 없다.** 테스트 환경은
// 발화 페이로드의 필드 이름을 검증하지도 해석하지도 않고, 실어 준 키를 그대로
// 핸들러에 얹는다(q4-touch-fire.md (d)). 그래서 여기 실은 `touches[0].x`는
// **구현이 읽기로 계약한 이름**(§2.5)을 그대로 따라 적은 것일 뿐이고, 실제 Lynx
// 런타임이 같은 이름을 채우는지는 `docs/e2e/`의 수동 확인이 진다.
//
// ⚠ 노출용 `data-` 속성은 하이픈 없는 한 낱말이다(§2.6). 하이픈을 더 넣으면 렌더가
// `SyntaxError`로 터지고 같은 파일 뒤 테스트까지 연쇄로 깨진다.

// §1.5가 문자열로 못박은 빈 문서. 여기서 `strokesSvgDocument`를 불러 기대값을 만들면
// 「구현이 자기가 부른 함수와 같다」는 공허한 단언이 된다 — 계약의 글자를 그대로 적는다.
const emptyDocument =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"></svg>';

function renderSurface(overrides: {
  strokes?: readonly Stroke[];
  onStrokeComplete?: (stroke: Stroke) => void;
  onStrokeCancel?: () => void;
}) {
  return render(
    <DrawingSurface
      strokes={overrides.strokes ?? []}
      width={300}
      height={300}
      color="#1A1C20"
      strokeWidth={6}
      onStrokeComplete={overrides.onStrokeComplete ?? (() => {})}
      onStrokeCancel={overrides.onStrokeCancel ?? (() => {})}
    />,
  );
}

// DS1
test("[DS1] 초기 렌더에 표면이 있고 획 0개·점 0개·빈 경로를 노출한다", () => {
  renderSurface({});

  const surface = screen.getByTestId("drawing-surface");
  expect(surface).toHaveAttribute("data-strokes", "0");
  expect(surface).toHaveAttribute("data-points", "0");
  expect(surface).toHaveAttribute("data-path", "");
});

// DS2
test("[DS2] 초기 content가 계약 §1.5의 빈 문서 문자열과 같다", () => {
  renderSurface({});

  expect(screen.getByTestId("drawing-surface")).toHaveAttribute("content", emptyDocument);
});

// DS3
test("[DS3] touchstart 하나가 점 하나짜리 진행 획을 세운다", () => {
  renderSurface({});
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 0, y: 0 }] });

  expect(surface).toHaveAttribute("data-points", "1");
  // 점 하나짜리 획은 자기 자신으로 가는 `L`을 달아 눈에 보이는 점획이 된다(§1.5).
  expect(surface).toHaveAttribute("data-path", "M 0 0 L 0 0");
});

// DS4
test("[DS4] touchmove가 진행 획 끝에 입력 순서 그대로 점을 덧붙인다", () => {
  renderSurface({});
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 0, y: 0 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 2, y: 3 }] });

  expect(surface).toHaveAttribute("data-points", "3");
  expect(surface).toHaveAttribute("data-path", "M 0 0 L 1 1 L 2 3");
});

// DS5
test("[DS5] touchend가 모은 점들을 한 번 올리고 진행 획을 비운다", () => {
  const onStrokeComplete = vi.fn<(stroke: Stroke) => void>();
  renderSurface({ onStrokeComplete });
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 2 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 3, y: 4 }] });
  fireEvent.touchend(surface, {});

  expect(onStrokeComplete).toHaveBeenCalledTimes(1);
  expect(onStrokeComplete).toHaveBeenCalledWith([
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);
  expect(surface).toHaveAttribute("data-points", "0");
  expect(surface).toHaveAttribute("data-path", "");
});

// DS6
test("[DS6] touchend 뒤의 touchstart는 새 획을 시작하고 완료를 더 올리지 않는다", () => {
  const onStrokeComplete = vi.fn<(stroke: Stroke) => void>();
  renderSurface({ onStrokeComplete });
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchend(surface, {});
  fireEvent.touchstart(surface, { touches: [{ x: 9, y: 9 }] });

  expect(onStrokeComplete).toHaveBeenCalledTimes(1);
  expect(surface).toHaveAttribute("data-points", "1");
  expect(surface).toHaveAttribute("data-path", "M 9 9 L 9 9");
});

// DS7
test("[DS7] touchcancel은 진행 획을 확정하지 않고 버린다", () => {
  const onStrokeComplete = vi.fn<(stroke: Stroke) => void>();
  const onStrokeCancel = vi.fn<() => void>();
  renderSurface({ onStrokeComplete, onStrokeCancel });
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 2, y: 2 }] });
  fireEvent.touchcancel(surface, {});

  expect(onStrokeCancel).toHaveBeenCalledTimes(1);
  expect(onStrokeComplete).not.toHaveBeenCalled();
  expect(surface).toHaveAttribute("data-points", "0");
});

// DS8
test("[DS8] touches가 빈 touchmove는 아무 일도 하지 않고 던지지 않는다", () => {
  renderSurface({});
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  expect(() => fireEvent.touchmove(surface, { touches: [] })).not.toThrow();

  expect(surface).toHaveAttribute("data-points", "1");
  expect(surface).toHaveAttribute("data-path", "M 1 1 L 1 1");
});

// DS9
test("[DS9] detail만 실은 발화로는 점이 쌓이지 않는다 — 구현이 touches[0]을 읽는다", () => {
  renderSurface({});
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { detail: { x: 5, y: 6 } });
  fireEvent.touchmove(surface, { detail: { x: 7, y: 8 } });

  expect(surface).toHaveAttribute("data-points", "0");
  expect(surface).toHaveAttribute("data-path", "");
});

// DS10
test("[DS10] content가 끝난 획과 진행 중인 획을 함께 그린다", () => {
  const strokes: readonly Stroke[] = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    [
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ],
  ];
  renderSurface({ strokes });
  const surface = screen.getByTestId("drawing-surface");

  expect(surface).toHaveAttribute("data-strokes", "2");
  expect(surface.getAttribute("content")?.split("<path").length).toBe(3);

  fireEvent.touchstart(surface, { touches: [{ x: 8, y: 8 }] });

  expect(surface.getAttribute("content")?.split("<path").length).toBe(4);
});

// DS11
test("[DS11] strokes를 빈 배열로 다시 렌더하면 content가 빈 문서로 돌아간다", () => {
  const strokes: readonly Stroke[] = [[{ x: 4, y: 5 }]];
  const { rerender } = renderSurface({ strokes });
  const surface = screen.getByTestId("drawing-surface");

  expect(surface.getAttribute("content")).not.toBe(emptyDocument);

  rerender(
    <DrawingSurface
      strokes={[]}
      width={300}
      height={300}
      color="#1A1C20"
      strokeWidth={6}
      onStrokeComplete={() => {}}
      onStrokeCancel={() => {}}
    />,
  );

  expect(screen.getByTestId("drawing-surface")).toHaveAttribute("content", emptyDocument);
});

// DS12
test("[DS12] 진행 중인 획 위에 새 touchstart가 오면 진행분이 취소로 보고되고 새 획이 선다", () => {
  const onStrokeComplete = vi.fn<(stroke: Stroke) => void>();
  const onStrokeCancel = vi.fn<() => void>();
  renderSurface({ onStrokeComplete, onStrokeCancel });
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 2, y: 2 }] });
  // 획을 긋는 도중에 둘째 손가락이 닿는 자리다 — 손가락을 떼지 않았으므로 `touchend`가
  // 아니라 `touchstart`가 다시 온다.
  fireEvent.touchstart(surface, { touches: [{ x: 7, y: 7 }] });

  // 끼어듦은 **중단**이지 완성이 아니다. 완성으로 올리면 사용자가 긋지 않은 획이 글자에
  // 섞여 인식 결과가 오염되고, 아무것도 올리지 않으면 모은 점이 어느 계수도 늘리지 않고
  // 조용히 사라져 계수 줄이 관측 도구 구실을 못 한다.
  expect(onStrokeCancel).toHaveBeenCalledTimes(1);
  expect(onStrokeComplete).not.toHaveBeenCalled();

  // 그리고 새 획은 실제로 시작된다 — 버리기만 하고 마는 것이 아니다.
  expect(surface).toHaveAttribute("data-points", "1");
  expect(surface).toHaveAttribute("data-path", "M 7 7 L 7 7");
});

// DS13
//
// 크기가 두 자리에 있다 — `probeSurfaceSize`(TS)와 `.drawing-surface`의 CSS 박스.
// 저장소 규약이 시각 값을 CSS에 두라 하므로(인라인 `style` 금지) 한 자리로 합칠 수
// 없고, 대신 **둘이 같은 수를 든다는 사실을 기계가 지킨다.**
//
// 왜 이것을 거나: `viewBox`가 `0 0 probeSurfaceSize`인데 CSS 박스가 다른 수면 좌표
// 변환이 항등이 아니게 되어 획이 손가락과 다른 자리에 그려진다. 그 증상은
// `docs/e2e/handwriting-probe.md`의 **E2(Q1-b 「위치가 맞는가」)** 가 묻는 것과 똑같이
// 보여서, 플랫폼 문제가 아닌 이유로 그 항목이 「어긋난다」로 답하게 된다. 실기의 답이
// 오염되는 것을 막으려면 여기서 막는 편이 싸다.
//
// 계산된 스타일을 보지 않는다 — jsdom은 Lynx 스타일을 계산하지 않는다. 읽는 것은
// **CSS 파일의 글자**이고, 같은 방식의 선례가 `@libitums/ui-lynx`에 여럿 있다.
test("[DS13] CSS 박스가 probeSurfaceSize와 같은 수를 든다 — 좌표 변환이 항등이어야 한다", () => {
  const styles = readFileSync(resolve(import.meta.dirname, "drawing-surface.css"), "utf8");

  expect(styles).toMatch(
    new RegExp(
      `\\.drawing-surface\\s*\\{[^}]*width:\\s*${probeSurfaceSize.width}px[^}]*` +
        `height:\\s*${probeSurfaceSize.height}px`,
      "s",
    ),
  );
});
