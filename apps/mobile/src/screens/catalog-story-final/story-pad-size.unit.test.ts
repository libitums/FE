import { describe, expect, it } from "vitest";

import {
  cssDeclaration,
  cssRuleBody,
  readCssWithoutComments,
} from "../../lib/wcag-contrast.test-support";
import type { Stroke } from "../../lib/handwriting-recognition";
import {
  canonicalStrokes,
  storyPadPoints,
  storyPadSizeOf,
  storyPadStrokeWidth,
  type StoryPadSize,
} from "./story-pad-size";
import { storyTraceRequestOf } from "./use-story-trace";

// `unit` 계층: 작은 화면의 쓰기 칸 크기 단계와, 칸 크기가 달라도 채점 요청이 같다는 것(좌표 정규화).

const sizes: readonly StoryPadSize[] = ["l", "m", "s"];
/** 기준 칸(220)에서 그은 「ㅇ」 비슷한 획 둘. */
const canonical: readonly Stroke[] = [
  [
    { x: 60, y: 50 },
    { x: 110, y: 30 },
    { x: 160, y: 70 },
  ],
  [
    { x: 40, y: 150 },
    { x: 180, y: 150 },
  ],
];
const drawnAt = (size: StoryPadSize): Stroke[] => {
  const scale = storyPadPoints[size] / storyPadPoints.l;
  return canonical.map((stroke) => stroke.map((p) => ({ x: p.x * scale, y: p.y * scale })));
};

describe("story-pad-size", () => {
  it("[SP1] 쓸 수 있는 높이로 단계를 고른다 — 16 759 → l, 13 mini 728 → m, SE 647 · 360×640 Android 616 → s, 모르면 l", () => {
    expect(storyPadSizeOf(759)).toBe("l");
    expect(storyPadSizeOf(750)).toBe("l");
    expect(storyPadSizeOf(728)).toBe("m");
    expect(storyPadSizeOf(660)).toBe("m");
    expect(storyPadSizeOf(647)).toBe("s");
    expect(storyPadSizeOf(616)).toBe("s");
    expect(storyPadSizeOf(Number.NaN)).toBe("l");
  });

  it("[SP2] 칸 크기가 달라도 같은 모양의 획은 같은 채점 요청이 된다(기준 칸 좌표로 정규화)", () => {
    const base = storyTraceRequestOf("왔", canonical, "l");
    for (const size of sizes) {
      const request = storyTraceRequestOf("왔", drawnAt(size), size);
      expect(request.width).toBe(220);
      expect(request.height).toBe(220);
      expect(request.fontSize).toBe(base.fontSize);
      expect(request.strokeWidth).toBe(base.strokeWidth);
      expect(request.tolerance).toBe(base.tolerance);
      request.strokes.forEach((stroke, s) =>
        stroke.forEach((point, i) => {
          expect(point.x).toBeCloseTo(canonical[s]?.[i]?.x ?? Number.NaN, 6);
          expect(point.y).toBeCloseTo(canonical[s]?.[i]?.y ?? Number.NaN, 6);
        }),
      );
    }
  });

  it("[SP3] 기준 칸에서는 좌표를 바꾸지 않고, 화면 펜 굵기만 칸 비율로 준다", () => {
    expect(canonicalStrokes(canonical, "l")).toEqual(canonical);
    expect(storyPadStrokeWidth(11, "l")).toBe(11);
    expect(storyPadStrokeWidth(11, "m")).toBe(8.8);
    expect(storyPadStrokeWidth(11, "s")).toBe(7.2);
  });

  it("[SP4] CSS의 단계별 칸 · 표면 · 안내 상자 크기가 코드의 수와 같다(획이 손가락과 같은 자리에 그려지게)", () => {
    const css = readCssWithoutComments(
      "src/screens/catalog-story-final/catalog-story-final-screen.css",
    );
    for (const size of sizes) {
      const px = `${storyPadPoints[size]}px`;
      const pad = cssRuleBody(css, new RegExp(`\\.catalog-story-final-pad-${size}`));
      const box = cssRuleBody(css, new RegExp(`\\.catalog-story-final-pad-box-${size}`));
      expect(cssDeclaration(pad, "width")).toBe(px);
      expect(cssDeclaration(pad, "height")).toBe(px);
      expect(cssDeclaration(box, "width")).toBe(px);
      expect(cssDeclaration(box, "height")).toBe(px);
    }
  });
});
