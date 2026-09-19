// 손글씨 탐침 화면의 순수 로직 — 좌표를 SVG 문서 문자열로 바꾼다
// (계약 .agent-harness/work/lib-263/spec.md §1).
//
// 획 좌표 타입은 `lib/handwriting-recognition.ts`가 소유하고 여기서 가져다 쓴다 —
// 접점과 화면이 함께 쓰는 어휘라 화면 무관이고, `screens/` → `lib/`가 이 저장소의
// 의존 방향이다. 표면 크기·굵기·렌더 옵션은 이 탐침 바깥에 소비자가 없어 여기 남는다.

import type { Stroke } from "../../lib/handwriting-recognition";

/** SVG 문서를 짓는 데 필요한, 좌표가 아닌 값들. */
export type StrokeRenderOptions = {
  readonly width: number;
  readonly height: number;
  /** 획 색. CSS 색 문자열이고 `currentColor`가 아니다 (§1.6). */
  readonly color: string;
  readonly strokeWidth: number;
};

/**
 * 출력 문자열에 들어가는 모든 수치가 지나는 자리 (§1.4). export하지 않는다 —
 * 이 모듈 밖에 소비자가 없다.
 *
 * 좌표와 `viewBox`·굵기가 **같은 함수**를 지나게 해서 서식이 두 벌이 되는 것을 막는다.
 * 서식이 갈리면 `d`와 `viewBox`가 서로 다른 반올림을 쓰게 되고, 그 어긋남은 그림에서만
 * 보여서 원인을 사람이 가리기 어렵다.
 *
 * 소수점 첫째 자리인 근거: 정수로 버리면 짧은 획의 점들이 같은 좌표로 뭉치고, 자리를
 * 더 늘리면 부동소수 표현이 문자열에 새어 나와 단언이 기계마다 갈린다.
 */
function formatCoordinate(value: number): string {
  const rounded = Math.round(value * 10) / 10;

  // `String(-0)`이 이미 `"0"`이라 눈에는 안 보이지만, 정규화를 건너뛰면 `-0`이 다른
  // 경로의 비교로 새어 나가 판정을 가른다. 정규화 자리를 여기 하나로 모은다.
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** 획 하나를 SVG `path`의 `d` 속성 문자열로 바꾼다. 빈 획은 빈 문자열이다. */
export function strokePathData(stroke: Stroke): string {
  const [first, ...rest] = stroke;

  if (first === undefined) {
    return "";
  }

  // ⭐ 점이 하나뿐인 획은 자기 자신으로 가는 `L`을 달아 길이 0인 subpath가 된다.
  // §1.7이 늘 다는 `stroke-linecap="round"`가 그것을 원으로 그려서 점획이 눈에 남는다 —
  // 안 보이게 두면 「획이 하나 사라졌다」가 좌표 수집 실패인지 렌더 규칙인지 갈린다.
  const rays = rest.length === 0 ? [first] : rest;

  const head = `M ${formatCoordinate(first.x)} ${formatCoordinate(first.y)}`;

  return rays.reduce(
    (data, point) => `${data} L ${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`,
    head,
  );
}

/** 획 목록을 `<svg>`의 `content` 속성에 그대로 넣을 SVG 문서 문자열로 바꾼다. */
export function strokesSvgDocument(
  strokes: readonly Stroke[],
  options: StrokeRenderOptions,
): string {
  const width = formatCoordinate(options.width);
  const height = formatCoordinate(options.height);
  const strokeWidth = formatCoordinate(options.strokeWidth);

  // 속성 이름과 순서가 계약이다(§1.7) — 문자열 비교로 단언하기 때문이다.
  // 색을 여기 문자열로 싣는 것도 계약이다(§1.6): 호스트가 푸는 `current-color`에
  // 기대면 「그었는데 안 보인다」가 좌표 실패인지 색 해석 실패인지로 갈린다.
  const paths = strokes
    .map((stroke) => strokePathData(stroke))
    .filter((data) => data !== "")
    .map(
      (data) =>
        `<path d="${data}" fill="none" stroke="${options.color}" stroke-width="${strokeWidth}"` +
        ` stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");

  // `viewBox`는 항상 `0 0 width height`다 — 표면의 CSS 박스와 같은 수를 넣어 좌표
  // 변환을 항등으로 만든다(§1.6 · §2.7).
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"` +
    ` viewBox="0 0 ${width} ${height}">${paths}</svg>`
  );
}

/**
 * 그리기 표면의 고정 크기. `viewBox`·CSS 박스와 같은 수를 쓴다 (§2.7).
 *
 * ⚠ 같은 수가 `drawing-surface.css`에도 있다 — 시각 값을 CSS에 두는 규약 때문에 한
 * 자리로 합칠 수 없다. 둘이 갈리면 좌표 변환이 항등이 아니게 되어 획이 손가락과 다른
 * 자리에 그려진다. `DrawingSurface.ui.test.tsx`의 DS13이 둘을 묶는다.
 */
export const probeSurfaceSize = { width: 300, height: 300 } as const;

/** 그리기 표면의 획 굵기 (§2.7). */
export const probeStrokeWidth = 6;
