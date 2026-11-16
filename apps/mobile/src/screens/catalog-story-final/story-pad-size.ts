import { useGlobalProps } from "@lynx-js/react";

import type { Stroke } from "../../lib/handwriting-recognition";
import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom } from "../../lib/safe-area";

// 이야기 파이널 쓰기 칸의 크기 단계입니다. 작은 화면에서 220 칸이 대답 줄 · 「Trace it.」을 덮어(판 스크롤이 거의 0)
// 칸을 화면 높이에 맞춰 줄입니다. **채점은 늘 기준 칸(220)에서 합니다** — 그린 획을 기준 칸 좌표로 옮겨 견주므로
// 칸 크기가 달라도 같은 모양은 같은 판정입니다. 크기 값은 CSS 클래스가 집니다(인라인 style 금지, `DrawingSurface`).

export type StoryPadSize = "l" | "m" | "s";

/** 단계별 칸 한 변(pt) — `catalog-story-final-screen.css`의 `-pad-<단계>` · `-pad-box-<단계>`와 같은 수입니다. */
export const storyPadPoints: Readonly<Record<StoryPadSize, number>> = { l: 220, m: 176, s: 144 };

/** 채점 기준 칸 한 변(pt) — 안내 그림 · 채점 마스크가 이 크기로 구워집니다. */
export const storyTraceCanonicalSide = storyPadPoints.l;

/** 쓸 수 있는 높이(창 − 안전 영역 위 · 아래, pt)로 단계를 고릅니다. 모르면 기준 칸입니다. */
export function storyPadSizeOf(usableHeight: number): StoryPadSize {
  if (!Number.isFinite(usableHeight) || usableHeight >= 750) return "l";
  return usableHeight >= 660 ? "m" : "s";
}

/** 그린 칸 좌표의 획을 기준 칸 좌표로 옮깁니다 — 채점은 이 획으로 합니다. */
export function canonicalStrokes(strokes: readonly Stroke[], size: StoryPadSize): Stroke[] {
  const scale = storyTraceCanonicalSide / storyPadPoints[size];
  return strokes.map((stroke) =>
    stroke.map((point) => ({ x: point.x * scale, y: point.y * scale })),
  );
}

/** 화면에 그릴 펜 굵기 — 기준 칸의 굵기를 칸 비율로 줄입니다(채점 굵기는 기준 그대로). */
export function storyPadStrokeWidth(canonicalWidth: number, size: StoryPadSize): number {
  return Math.round(((canonicalWidth * storyPadPoints[size]) / storyTraceCanonicalSide) * 10) / 10;
}

/** 이 기기의 칸 단계 — 학습 밀도와 같은 전역 값(창 높이 · 안전 영역)에서 읽습니다. */
export function useStoryPadSize(): StoryPadSize {
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const info = typeof SystemInfo === "undefined" ? undefined : SystemInfo;
  return storyPadSizeOf(screenHeightFrom(info) - insets.top - insets.bottom);
}
