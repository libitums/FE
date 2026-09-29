// 쓰기 캔버스의 **수**(판 크기 · 안내 글자 크기 · 획 굵기 · 팽창 반경)와 견주기 요청을 짓는
// 순수 함수를 소유합니다. UI를 import하지 않습니다.
//
// 캔버스는 자리마다 크기가 다릅니다 — 최종 테스트의 장면(Figma 79-6378, 370 × 450)과 학습
// 껍데기의 무대 카드(300 × 300) 둘입니다. 크기가 바뀌면 안내 글자 · 획 굵기 · 팽창 반경이
// 함께 바뀌어야 지표의 뜻이 유지되므로 네 수를 한 묶음으로 둡니다.

import { color } from "@libitums/design-tokens";

import type { Stroke } from "./handwriting-recognition";
import type { HandwritingTraceRequest } from "./handwriting-trace";

/**
 * 캔버스가 서는 자리입니다. `stage`는 화면 폭을 거의 다 쓰는 장면 위 캔버스, `card`는 학습
 * 껍데기의 무대 카드 안 캔버스입니다. 짝 CSS의 크기 클래스(`writing-canvas-<size>`)와 1:1입니다.
 */
export type WritingCanvasSize = "stage" | "card";

export type WritingCanvasGeometry = {
  /** 표면 크기(point)입니다. 짝 CSS의 크기 클래스와 **같은 수**여야 합니다. */
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly strokeWidth: number;
  /** 팽창 반경(표면 point)입니다. 「얼마나 빗나가도 따라 쓴 것으로 보는가」입니다. */
  readonly tolerance: number;
};

/**
 * 자리별 수입니다.
 *
 * `card`는 **손글씨 탐침과 같은 수**입니다(300 · 240 · 14 · 6) — 이 저장소에서 기기에 올려 본
 * 유일한 묶음이라(2026-09-28, `docs/e2e/handwriting-probe.md`) 크기가 맞는 자리는 그것을
 * 그대로 씁니다.
 *
 * ⚠ `stage`는 **임시입니다 — 기기에서 잡습니다.** 판은 디자인 값(370 × 450)이고, 안내 글자는
 * 탐침처럼 짧은 변의 0.8입니다. 획 굵기 · 팽창 반경은 탐침의 값을 글자 크기 비(296 / 240)로
 * 늘린 것이라 **잰 값이 아닙니다.** 탐침에서 획 굵기는 「안내 획이 실제로 차지하는 두께」에
 * 맞춘 수였고(그보다 얇으면 덮음의 상한이 1에 못 미칩니다), 글자가 커지면 그 두께도 커지므로
 * 비례로 옮겼습니다. 값이 오는 날 이 네 수만 바뀝니다.
 */
export const writingCanvasGeometries: Record<WritingCanvasSize, WritingCanvasGeometry> = {
  stage: { width: 370, height: 450, fontSize: 296, strokeWidth: 17, tolerance: 7 },
  card: { width: 300, height: 300, fontSize: 240, strokeWidth: 14, tolerance: 6 },
};

// 안내 글자를 구울 글꼴입니다. 탐침과 같은 글꼴이고, 디자인이 고른 손글씨체가 기기에 없어
// 고딕으로 맞춰 둔 값입니다(`docs/e2e/handwriting-probe.md`). 화면이 이 글꼴로 글자를 그리지
// 않습니다 — 안내는 호스트가 구운 그림입니다.
const guideFontName = "AppleSDGothicNeo-Regular";

/**
 * 견주기와 안내 그림이 **같은 요청**을 씁니다.
 *
 * ⭐ 두 자리가 글자 · 크기 · 글꼴을 따로 들면 화면이 보여 주는 안내와 채점되는 안내가 갈립니다.
 * 탐침에서 이미 그렇게 틀렸습니다 — 22pt 어긋나 화면의 안내를 정확히 따라 써도 0점이었습니다.
 */
export function writingTraceRequest(
  geometry: WritingCanvasGeometry,
  glyph: string,
  strokes: readonly Stroke[],
): HandwritingTraceRequest {
  return {
    width: geometry.width,
    height: geometry.height,
    strokeWidth: geometry.strokeWidth,
    strokes,
    glyph,
    fontSize: geometry.fontSize,
    fontName: guideFontName,
    tolerance: geometry.tolerance,
    // 「흐리게 깐다」의 색입니다. 캔버스 면(gray-100) 위에서 보이되 학습자의 획(gray-900)보다
    // 한참 물러나는 값이고, 탐침이 흰 면 위에서 기기로 본 색과 같습니다. 색의 정본은 토큰입니다
    // (ADR-0014 D1).
    guideColor: color.gray[400],
  };
}
