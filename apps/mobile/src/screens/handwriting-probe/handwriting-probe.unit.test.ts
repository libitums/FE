import { expect, test } from "vitest";

import type { Stroke } from "../../lib/handwriting-recognition";
import {
  probeStrokeWidth,
  probeSurfaceSize,
  strokePathData,
  strokesSvgDocument,
  type StrokeRenderOptions,
} from "./handwriting-probe";

// 형태의 정본: ../../lib/answer-result.unit.test.ts
//
// 획 좌표 타입은 `lib/handwriting-recognition`이 소유합니다 — 접점과 화면이 함께
// 쓰는 어휘라 화면 무관이고, `screens/` → `lib/`가 이 저장소의 의존 방향입니다.
//
// 기대 문자열은 계약의 표를 그대로 옮긴 것입니다. 서식 규칙(소수점 첫째 자리
// 반올림, 음의 0 정규화, 토큰 사이 공백 하나, 쉼표 없음)을 이 파일에서 다시
// 계산하지 않습니다 — 계약이 못박은 문자열과의 동등만 봅니다.

const options: StrokeRenderOptions = {
  width: 300,
  height: 300,
  color: "#1A1C20",
  strokeWidth: 6,
};

// 획이 하나도 없을 때의 문서입니다. 빈 획만 있는 목록도 이것과 같아야 합니다.
const emptyDocument =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"></svg>';

// PD1
test("빈 획의 path 데이터는 빈 문자열이다", () => {
  expect(strokePathData([])).toBe("");
});

// PD2 — ⭐ 점이 하나뿐인 획도 눈에 보여야 합니다. 자기 자신으로 가는 `L`이 길이
// 0인 subpath를 만들고, `stroke-linecap="round"`가 그것을 원으로 그립니다.
test("점이 하나인 획은 자기 자신으로 가는 L을 달아 길이 0인 subpath가 된다", () => {
  expect(strokePathData([{ x: 4, y: 5 }])).toBe("M 4 5 L 4 5");
});

// PD3
test("점이 둘인 획은 첫 점의 M 뒤에 L 하나를 잇는다", () => {
  expect(
    strokePathData([
      { x: 0, y: 0 },
      { x: 10, y: 12 },
    ]),
  ).toBe("M 0 0 L 10 12");
});

// PD4
test("점이 여럿인 획은 입력 순서 그대로 L을 잇는다", () => {
  expect(
    strokePathData([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 3 },
    ]),
  ).toBe("M 0 0 L 1 1 L 2 3");
});

// PD5
test("좌표는 소수점 첫째 자리로 반올림된다", () => {
  expect(
    strokePathData([
      { x: 1.24, y: 2.25 },
      { x: 3, y: 4 },
    ]),
  ).toBe("M 1.2 2.3 L 3 4");
});

// PD6
test("음의 0으로 반올림되는 좌표는 0으로 정규화된다", () => {
  expect(
    strokePathData([
      { x: -0.02, y: 0 },
      { x: 1, y: 1 },
    ]),
  ).toBe("M 0 0 L 1 1");
});

// SD1
test("획이 0개면 path 없는 빈 SVG 문서다", () => {
  const document = strokesSvgDocument([], options);

  expect(document).toBe(emptyDocument);
  expect(document).not.toContain("<path");
});

// SD2 — 빈 획은 `<path>`를 만들지 않으므로 획이 0개인 것과 문자열이 같습니다.
test("빈 획만 있는 목록은 획이 0개인 것과 같은 문서다", () => {
  expect(strokesSvgDocument([[]], options)).toBe(emptyDocument);
});

// SD3 — 속성 이름과 순서가 계약입니다.
test("획 하나는 계약이 고정한 속성과 순서를 가진 path 하나가 된다", () => {
  expect(strokesSvgDocument([[{ x: 4, y: 5 }]], options)).toBe(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
      '<path d="M 4 5 L 4 5" fill="none" stroke="#1A1C20" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
  );
});

// SD4
test("획이 둘이면 path가 둘이고 d 값이 입력 순서 그대로다", () => {
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

  const document = strokesSvgDocument(strokes, options);

  // `match`가 아니라 분할로 셉니다 — 0건일 때 `match`는 `null`이라 실패 메시지가
  // 「개수가 몇이어야 하는데 몇이다」를 말하지 못합니다.
  expect(document.split("<path").length - 1).toBe(2);
  expect([...document.matchAll(/ d="([^"]*)"/g)].map((match) => match[1])).toEqual([
    "M 0 0 L 1 1",
    "M 2 2 L 3 3",
  ]);
});

// SD5 — `viewBox`는 항상 `0 0 width height`이고, 크기도 좌표와 같은 서식 함수를
// 지납니다.
test("width와 height는 좌표와 같은 서식으로 viewBox에 들어간다", () => {
  expect(
    strokesSvgDocument([], { width: 12.34, height: 45.67, color: "#1A1C20", strokeWidth: 6 }),
  ).toBe(
    '<svg xmlns="http://www.w3.org/2000/svg" width="12.3" height="45.7" viewBox="0 0 12.3 45.7"></svg>',
  );
});

// SD6 — 색·굵기는 함수 밖에서 들어옵니다. 함수 안에 16진 색을 박지 않습니다
// (ADR-0014).
test("색과 굵기는 옵션에서 오고 출력의 그 자리만 바뀐다", () => {
  const document = strokesSvgDocument([[{ x: 4, y: 5 }]], {
    ...options,
    color: "#FF0000",
    strokeWidth: 2,
  });

  expect(document).toBe(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
      '<path d="M 4 5 L 4 5" fill="none" stroke="#FF0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
  );
});

// ⭐ 색이 호스트가 푸는 `current-color`가 아니라 문자열 안의 SVG 속성이라는 것이
// 계약의 결정입니다 — Q1의 「그었는데 안 보인다」가 좌표 수집 실패인지 색 해석
// 실패인지로 갈리는 것을 막습니다.
test("문서는 색을 current-color가 아니라 SVG stroke 속성으로 싣는다", () => {
  const document = strokesSvgDocument([[{ x: 4, y: 5 }]], options);

  expect(document).toContain('stroke="#1A1C20"');
  expect(document).toContain('stroke-width="6"');
  expect(document).toContain('stroke-linecap="round"');
  expect(document).toContain('viewBox="0 0 300 300"');
  expect(document).not.toContain("current-color");
  expect(document).not.toContain("currentColor");
});

// SZ1
test("표면 크기는 정사각이고 굵기와 함께 양수다", () => {
  expect(probeSurfaceSize.width).toBe(probeSurfaceSize.height);
  expect(probeSurfaceSize.width).toBeGreaterThan(0);
  expect(probeStrokeWidth).toBeGreaterThan(0);
});
