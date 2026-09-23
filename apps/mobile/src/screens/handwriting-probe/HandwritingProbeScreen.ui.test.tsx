import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { HandwritingProbeScreen } from "./HandwritingProbeScreen";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 `toBeVisible`·`toHaveStyle`·`toHaveClass`를 쓰지
// 않습니다 (vitest.setup.ts).
//
// ⚠ **전역 목록은 특정 이름을 단언하지 않습니다.** 테스트 환경의 전역 셋과 실기의
// 전역 셋이 다르고, 같은 실기 안에서도 메인 스레드와 백그라운드 스레드가 다릅니다.
// 여기서 볼 수 있는 것은 **자기 정합성**뿐입니다 — 「몇 개라고 적었는가」와 「몇
// 줄을 그렸는가」가 같고 정렬돼 있다는 것입니다. 실제 이름 확인은 `docs/e2e/`의
// 수동 항목이 집니다.
//
// ⚠ 터치 페이로드의 한계는 `DrawingSurface.ui.test.tsx` 머리와 같습니다 — 환경이
// 필드 이름을 검증하지 않으므로 이 파일의 초록이 실기의 필드 이름을 보증하지
// 않습니다.

test("[SC1] 스크롤 영역이 정확히 하나이고 이름·속성·자식이 ADR-0022 3분할 그대로다", () => {
  const { container } = render(<HandwritingProbeScreen />);

  // 중첩 스크롤 0건 — 화면당 스크롤 영역은 정확히 하나입니다(ADR-0022).
  expect(container.querySelectorAll("scroll-view")).toHaveLength(1);

  const scroll = screen.getByTestId("handwriting-probe-screen-scroll");
  // 클래스와 `data-testid`가 같은 문자열입니다.
  expect(scroll.getAttribute("class")).toBe("handwriting-probe-screen-scroll");

  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
  // 스크롤 설정 축은 저 둘뿐입니다 — `bounces`·`enable-scroll`을 쓰지 않습니다.
  expect(
    [...scroll.attributes]
      .map((attribute) => attribute.name)
      .filter((name) => name.startsWith("scroll") || name === "bounces" || name === "enable-scroll")
      .sort(),
  ).toEqual(["scroll-bar-enable", "scroll-orientation"]);

  // 스크롤 컨테이너는 조작 단위가 아니라 상자입니다(ADR-0022 D5).
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");

  // 직계 자식은 전역 목록 상자 하나뿐입니다.
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "handwriting-probe-screen-globals");
});

test("[SC2] 전역 목록의 줄 수가 스스로 적은 수와 같고 오름차순이다", () => {
  render(<HandwritingProbeScreen />);

  const globals = screen.getByTestId("handwriting-probe-screen-globals");
  const names = [...globals.children].map((row) => row.textContent ?? "");

  expect(names.length).toBeGreaterThan(0);
  expect(globals).toHaveAttribute("data-globals", String(names.length));
  expect(names).toEqual([...names].sort());
});

test("[SC3] 액션 행에 표면·지우기·읽기·결과 줄·계수 줄이 그 순서로 있다", () => {
  render(<HandwritingProbeScreen />);

  const actions = screen.getByTestId("handwriting-probe-screen-actions");

  // 직계 자식으로 세지 않는 이유: ReactLynx가 자식 **컴포넌트**의 루트를
  // `<wrapper>`로 감쌉니다(표면이 그 경우입니다). 그래서 세는 것은 이름이 붙은
  // 것들의 **문서 순서**입니다 — `querySelectorAll`이 문서 순서로 줍니다.
  expect(
    [...actions.querySelectorAll("[data-testid]")].map((node) => node.getAttribute("data-testid")),
  ).toEqual([
    "drawing-surface",
    "handwriting-probe-screen-clear",
    "handwriting-probe-screen-read",
    "handwriting-probe-screen-result",
    "handwriting-probe-screen-counts",
  ]);

  // ⭐ 그리기 표면은 스크롤 영역 **밖**의 고정 영역에 있습니다.
  const scroll = screen.getByTestId("handwriting-probe-screen-scroll");
  expect(scroll.contains(screen.getByTestId("drawing-surface"))).toBe(false);
});

test("[SC4] 제목이 header이고 조작 수단마다 이름 있는 button 속성이 붙는다", () => {
  render(<HandwritingProbeScreen />);

  expect(screen.getByTestId("handwriting-probe-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );

  const clear = screen.getByTestId("handwriting-probe-screen-clear");
  expect(clear).toHaveAttribute("accessibility-element", "true");
  expect(clear).toHaveAttribute("accessibility-traits", "button");
  expect(clear).toHaveAttribute("accessibility-label", "지우기");

  const read = screen.getByTestId("handwriting-probe-screen-read");
  expect(read).toHaveAttribute("accessibility-element", "true");
  expect(read).toHaveAttribute("accessibility-traits", "button");
  expect(read).toHaveAttribute("accessibility-label", "읽기");
});

test("[SC5] 표면에서 획 하나를 그리면 화면의 획 수가 는다", () => {
  render(<HandwritingProbeScreen />);
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchmove(surface, { touches: [{ x: 2, y: 2 }] });
  fireEvent.touchend(surface, {});

  expect(screen.getByTestId("handwriting-probe-screen-counts")).toHaveAttribute(
    "data-strokes",
    "1",
  );
  // 화면이 든 끝난 획이 표면으로 다시 내려갑니다 — 진실이 하나입니다.
  expect(surface).toHaveAttribute("data-strokes", "1");
});

test("[SC6] 지우기가 획 수·취소 수·결과를 초기값으로 되돌린다", () => {
  render(<HandwritingProbeScreen />);
  const surface = screen.getByTestId("drawing-surface");

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchend(surface, {});
  fireEvent.touchstart(surface, { touches: [{ x: 2, y: 2 }] });
  fireEvent.touchcancel(surface, {});
  fireEvent.tap(screen.getByTestId("handwriting-probe-screen-read"), {});

  const counts = screen.getByTestId("handwriting-probe-screen-counts");
  expect(counts).toHaveAttribute("data-strokes", "1");
  expect(counts).toHaveAttribute("data-cancels", "1");

  fireEvent.tap(screen.getByTestId("handwriting-probe-screen-clear"), {});

  expect(counts).toHaveAttribute("data-strokes", "0");
  expect(counts).toHaveAttribute("data-cancels", "0");

  const result = screen.getByTestId("handwriting-probe-screen-result");
  expect(result).toHaveAttribute("data-status", "");
  // `toHaveTextContent("")`은 jest-dom이 거절합니다(빈 문자열은 늘 맞으므로) —
  // 본문이 실제로 비었는지는 `textContent`를 직접 봅니다.
  expect(result.textContent).toBe("");
});

test("[SC7] touchcancel이 취소 수를 늘린다", () => {
  render(<HandwritingProbeScreen />);
  const surface = screen.getByTestId("drawing-surface");

  expect(screen.getByTestId("handwriting-probe-screen-counts")).toHaveAttribute(
    "data-cancels",
    "0",
  );

  fireEvent.touchstart(surface, { touches: [{ x: 1, y: 1 }] });
  fireEvent.touchcancel(surface, {});

  const counts = screen.getByTestId("handwriting-probe-screen-counts");
  expect(counts).toHaveAttribute("data-cancels", "1");
  // 취소된 획은 확정되지 않습니다 — 그 신호가 획 속에 묻히면 Q1이 답을 못 냅니다.
  expect(counts).toHaveAttribute("data-strokes", "0");
});

test("[SC8] 표면에 accessibility-*가 하나도 없다", () => {
  render(<HandwritingProbeScreen />);

  // 존재 앵커로 표면을 먼저 잡습니다 — 부재 단언만 남기면 오타로도 초록이 됩니다.
  const surface = screen.getByTestId("drawing-surface");

  expect(surface).not.toHaveAttribute("accessibility-element");
  expect(surface).not.toHaveAttribute("accessibility-label");
  expect(surface).not.toHaveAttribute("accessibility-traits");
  expect(surface).not.toHaveAttribute("accessibility-elements-hidden");
});
