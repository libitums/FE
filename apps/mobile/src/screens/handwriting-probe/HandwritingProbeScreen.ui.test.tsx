import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { HandwritingProbeScreen } from "./HandwritingProbeScreen";
import { probeSurfaceSize } from "./handwriting-probe";

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
// ⚠ 터치 페이로드의 한계는 `components/DrawingSurface.ui.test.tsx` 머리와 같습니다 — 환경이
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

test("[SC3] 액션 행에 표면·지우기·읽기·결과·견주기·견주기 결과·계수가 그 순서로 있다", () => {
  render(<HandwritingProbeScreen />);

  const actions = screen.getByTestId("handwriting-probe-screen-actions");

  // 직계 자식으로 세지 않는 이유: ReactLynx가 자식 **컴포넌트**의 루트를
  // `<wrapper>`로 감쌉니다(표면이 그 경우입니다). 그래서 세는 것은 이름이 붙은
  // 것들의 **문서 순서**입니다 — `querySelectorAll`이 문서 순서로 줍니다.
  expect(
    [...actions.querySelectorAll("[data-testid]")].map((node) => node.getAttribute("data-testid")),
  ).toEqual([
    // ⚠ **안내가 목록에 없습니다.** 안내는 호스트가 구운 그림이고, 이 계층에는
    // `NativeModules`가 없어 그림이 오지 않습니다. 없는 것을 그린 척하지 않는 것이
    // 화면의 계약이라 요소 자체가 서지 않습니다 — 아래 SC3b가 그것을 따로 봅니다.
    "drawing-surface",
    "handwriting-probe-screen-clear",
    "handwriting-probe-screen-read",
    "handwriting-probe-screen-result",
    "handwriting-probe-screen-compare",
    "handwriting-probe-screen-trace",
    "handwriting-probe-screen-counts",
  ]);

  // ⭐ 그리기 표면은 스크롤 영역 **밖**의 고정 영역에 있습니다.
  const scroll = screen.getByTestId("handwriting-probe-screen-scroll");
  expect(scroll.contains(screen.getByTestId("drawing-surface"))).toBe(false);
});

// SC3b — 호스트가 없으면 안내가 **아예 서지 않습니다.**
//
// ⭐ 빈 그림을 그리거나 글자로 대신 그리지 않습니다. 화면이 글자를 그리면 Lynx와 UIKit이
// 다르게 배치해 **보는 것과 채점되는 것이 갈립니다** — 2026-09-28에 22pt 어긋났고, 화면에
// 보이는 안내를 정확히 따라 써도 점수가 0이었습니다. 없는 것을 그린 척하지 않는 것이
// 그 갈림을 원천에서 막습니다.
test("[SC3b] 호스트가 없으면 안내 그림이 서지 않는다", () => {
  render(<HandwritingProbeScreen />);

  expect(screen.queryByTestId("handwriting-probe-screen-guide")).not.toBeInTheDocument();
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

// 크기가 두 자리에 있습니다 — `probeSurfaceSize`(TS)와 표면에 붙는 크기 클래스의 CSS
// 박스입니다. 저장소 규약이 시각 값을 CSS에 두라 하므로(인라인 `style` 금지) 한 자리로 합칠
// 수 없고, 대신 **둘이 같은 수를 든다는 사실을 기계가 지킵니다.**
//
// 왜 이것을 거는가: `viewBox`가 `0 0 probeSurfaceSize`인데 CSS 박스가 다른 수면 좌표 변환이
// 항등이 아니게 되어 획이 손가락과 다른 자리에 그려집니다. 그 증상은
// `docs/e2e/handwriting-probe.md`의 **E2(Q1-b 「위치가 맞는가」)** 가 묻는 것과 똑같이 보여서,
// 플랫폼 문제가 아닌 이유로 그 항목이 「어긋난다」로 답하게 됩니다.
//
// 표면이 크기를 박던 때는 `DrawingSurface.ui.test.tsx`에 있었습니다 — 표면이 공용이 되며
// 크기를 부르는 쪽이 지게 되어 여기로 옮겼습니다. 계산된 스타일이 아니라 **CSS 파일의
// 글자**를 읽습니다.
test("[DS13] 표면의 크기 클래스가 probeSurfaceSize와 같은 수를 든다 — 좌표 변환이 항등이어야 한다", () => {
  render(<HandwritingProbeScreen />);
  expect(screen.getByTestId("drawing-surface").getAttribute("class")).toBe(
    "drawing-surface handwriting-probe-screen-surface",
  );

  const styles = readFileSync(resolve(import.meta.dirname, "handwriting-probe-screen.css"), "utf8");

  expect(styles).toMatch(
    new RegExp(
      `\\.handwriting-probe-screen-surface\\s*\\{[^}]*width:\\s*${probeSurfaceSize.width}px[^}]*` +
        `height:\\s*${probeSurfaceSize.height}px`,
      "s",
    ),
  );
});
