import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { WritingCanvas, type WritingCanvasProps } from "./WritingCanvas";
import type { Stroke } from "../lib/handwriting-recognition";
import { writingCanvasGeometries } from "../lib/writing-canvas";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). 캔버스는 흐름을 모르고 받은 것을
// 그리기만 하므로, 흐름 없이 prop만으로 봅니다.

function renderCanvas(overrides: Partial<WritingCanvasProps> = {}) {
  const props: WritingCanvasProps = {
    size: "stage",
    glyph: "주",
    guide: { kind: "hidden" },
    strokes: [],
    badge: { kind: "none" },
    erase: null,
    onStrokeComplete: vi.fn<(stroke: Stroke) => void>(),
    ...overrides,
  };
  render(<WritingCanvas {...props} />);
  return props;
}

// WV1 — 호스트가 구운 그림은 그대로 깔리고, 표면과 같은 크기 클래스를 씁니다.
test("[WV1] 그림 안내는 base64 그림으로 깔리고 낭독 이름이 안내 글자다", () => {
  renderCanvas({ guide: { kind: "image", image: "aGVsbG8=" } });

  const guide = screen.getByTestId("writing-canvas-guide");
  expect(guide).toHaveAttribute("src", "data:image/png;base64,aGVsbG8=");
  expect(guide).toHaveAttribute("accessibility-label", "안내 글자 주");
  expect(screen.getByTestId("writing-canvas")).toHaveAttribute("data-guide", "image");
  expect(screen.queryByTestId("writing-canvas-guide-text")).not.toBeInTheDocument();
});

// WV2 — 호스트가 없으면 글자로 대신 보입니다.
test("[WV2] 글자 안내는 Lynx 텍스트로 음절을 보인다", () => {
  renderCanvas({ guide: { kind: "text" }, glyph: "세" });

  expect(screen.getByTestId("writing-canvas-guide-text").textContent).toBe("세");
  expect(screen.queryByTestId("writing-canvas-guide")).not.toBeInTheDocument();
});

// WV3 — 판정 뒤에는 안내가 걷히고 쓴 획과 배지만 남습니다.
test("[WV3] 안내가 숨으면 그림도 글자도 없고, 판정 배지가 선다", () => {
  renderCanvas({ badge: { kind: "verdict", result: "incorrect" } });

  expect(screen.getByTestId("writing-canvas")).toBeInTheDocument();
  expect(screen.queryByTestId("writing-canvas-guide")).not.toBeInTheDocument();
  expect(screen.queryByTestId("writing-canvas-guide-text")).not.toBeInTheDocument();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
});

// WV4 — 잴 수 없을 때는 배지 자리에 안내 한 줄이 섭니다.
test("[WV4] 알림 배지는 받은 문구를 그대로 보인다", () => {
  renderCanvas({ badge: { kind: "notice", text: "잴 수 없어요" } });

  expect(screen.getByTestId("writing-canvas-notice").textContent).toBe("잴 수 없어요");
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
});

// WV5 — 지우기는 받은 때만 있고, 누르면 받은 동작을 부릅니다.
test("[WV5] 지우기 버튼은 받은 이름으로 서고 누르면 그 동작을 부른다", () => {
  const run = vi.fn<() => void>();
  renderCanvas({ erase: { label: "다시 쓰기", run } });

  const button = within(screen.getByTestId("writing-canvas-erase")).getByTestId(
    "ui-lynx-round-button",
  );
  expect(button).toHaveAttribute("accessibility-label", "다시 쓰기");
  fireEvent.tap(button, {});
  expect(run).toHaveBeenCalledTimes(1);
});

test("[WV6] 지우기를 받지 않으면 버튼이 없다", () => {
  renderCanvas();
  expect(screen.getByTestId("writing-canvas")).toBeInTheDocument();
  expect(screen.queryByTestId("writing-canvas-erase")).not.toBeInTheDocument();
});

// WV7 — 표면이 획을 올리면 받은 콜백으로 갑니다. 끝난 획은 prop으로 그려집니다.
test("[WV7] 표면에서 끝난 획이 올라가고, 받은 획 수가 표면에 실린다", () => {
  const props = renderCanvas({ strokes: [[{ x: 1, y: 1 }]] });
  const surface = screen.getByTestId("drawing-surface");
  expect(surface).toHaveAttribute("data-strokes", "1");

  fireEvent.touchstart(surface, { touches: [{ x: 5, y: 6 }] });
  fireEvent.touchend(surface, {});
  expect(props.onStrokeComplete).toHaveBeenCalledWith([{ x: 5, y: 6 }]);
});

// WV8 — 크기가 두 자리(TS 수 묶음 · CSS 크기 클래스)에 있습니다. 갈리면 획이 손가락과 다른 자리에
// 그려지고, 안내 그림이 늘거나 줄어 채점과 화면이 갈립니다. 계산된 스타일이 아니라 CSS 파일의
// 글자를 읽습니다 — 탐침의 DS13과 같은 방식입니다.
test.each(["stage", "card"] as const)(
  "[WV8] %s의 크기 클래스가 수 묶음과 같은 수를 들고, 표면 · 그림이 그 클래스를 쓴다",
  (size) => {
    renderCanvas({ size, guide: { kind: "image", image: "aGVsbG8=" } });
    const geometry = writingCanvasGeometries[size];
    const styles = readFileSync(resolve(import.meta.dirname, "writing-canvas.css"), "utf8");

    expect(styles).toMatch(
      new RegExp(
        `\\.writing-canvas-${size}\\s*\\{[^}]*width:\\s*${geometry.width}px[^}]*` +
          `height:\\s*${geometry.height}px`,
        "s",
      ),
    );
    expect(styles).toMatch(
      new RegExp(
        `\\.writing-canvas-guide-text-${size}\\s*\\{[^}]*font-size:\\s*${geometry.fontSize}px`,
        "s",
      ),
    );
    expect(screen.getByTestId("drawing-surface").getAttribute("class")).toBe(
      `drawing-surface writing-canvas-${size}`,
    );
    expect(screen.getByTestId("writing-canvas-guide").getAttribute("class")).toBe(
      `writing-canvas-guide writing-canvas-${size}`,
    );
    expect(screen.getByTestId("drawing-surface").getAttribute("content")).toContain(
      `viewBox="0 0 ${geometry.width} ${geometry.height}"`,
    );
  },
);
