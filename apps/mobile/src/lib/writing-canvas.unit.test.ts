import { expect, test } from "vitest";

import { writingCanvasGeometries, writingTraceRequest } from "./writing-canvas";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

// WC1 — 견주기와 안내 그림이 같은 요청을 씁니다. 판 크기 · 글자 크기 · 굵기 · 반경이 한 묶음에서
// 와야 보는 안내와 재는 안내가 갈리지 않습니다.
test("[WC1] 요청은 자리의 수 묶음과 글자 · 획을 그대로 싣는다", () => {
  const geometry = writingCanvasGeometries.stage;
  const strokes = [[{ x: 1, y: 2 }]];

  expect(writingTraceRequest(geometry, "주", strokes)).toMatchObject({
    width: geometry.width,
    height: geometry.height,
    fontSize: geometry.fontSize,
    strokeWidth: geometry.strokeWidth,
    tolerance: geometry.tolerance,
    glyph: "주",
    strokes,
  });
});

// WC2 — 안내 그림의 색은 16진 색 문자열입니다(호스트가 `#RRGGBB`로 읽습니다).
test("[WC2] 안내 색은 #RRGGBB 문자열이다", () => {
  expect(writingTraceRequest(writingCanvasGeometries.workspace, "세", []).guideColor).toMatch(
    /^#[0-9A-Fa-f]{6}$/,
  );
});

// WC3 — 안내 글자는 판 안에 들어가야 합니다. 판 밖으로 나가면 잉크가 잘려 덮음의 분모가 줄고,
// 학습자가 덧그릴 자리도 없습니다.
test.each(["stage", "workspace"] as const)(
  "[WC3] %s의 안내 글자는 판의 짧은 변보다 작다",
  (size) => {
    const geometry = writingCanvasGeometries[size];
    expect(geometry.fontSize).toBeLessThan(Math.min(geometry.width, geometry.height));
    expect(geometry.strokeWidth).toBeGreaterThan(0);
    expect(geometry.tolerance).toBeGreaterThan(0);
  },
);
