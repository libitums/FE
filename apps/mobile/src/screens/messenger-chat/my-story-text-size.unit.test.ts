import { expect, test } from "vitest";

import { storyTextLines, textBoxSizeOf, textFit } from "./my-story-text";

// `unit` 계층(MS-U45 ~ U46): 글 상자 크기 A안(사용자 결정 2026-11-25) — 크기는 transform이 아니라 글자 크기로 그리고(선명), 줄은 쓰기를
// 마칠 때의 규칙으로 정해 크기를 바꿔도 다시 흐르지 않습니다. 편집 · 보기가 같은 함수를 씁니다.

test("MS-U45. 줄 나누기 — 한글 12자 폭 안에서 띄어쓰기로 나누고, 긴 낱말은 자르고, 크기와 무관하게 같은 줄", () => {
  expect(storyTextLines("오늘 처음 김치찌개 만들었어")).toEqual(["오늘 처음 김치찌개", "만들었어"]);
  expect(storyTextLines("안녕")).toEqual(["안녕"]);
  expect(storyTextLines("I made kimchi stew today")).toEqual(["I made kimchi stew", "today"]);
  expect(storyTextLines("가나다라마바사아자차카타파하")).toEqual([
    "가나다라마바사아자차카타",
    "파하",
  ]);
  expect(storyTextLines("  두  칸  ")).toEqual(["두 칸"]);
  expect(storyTextLines("")).toEqual([]);
});

test("MS-U46. 크기 — 글자 · 줄 높이 · 안쪽 여백에 scale을 곱하고(22 · 28 · 8/12), 끄는 동안은 확정한 크기에 대한 비만 transform", () => {
  expect(textBoxSizeOf(1, 1)).toEqual({
    fontSize: "22px",
    lineHeight: "28px",
    padding: "8px 14px",
    live: 1,
  });
  expect(textBoxSizeOf(2, 2)).toMatchObject({ fontSize: "44px", lineHeight: "56px", live: 1 });
  // 끄는 중: 확정 1, 지금 1.5 → 글자는 그대로, transform 1.5
  expect(textBoxSizeOf(1.5, 1)).toMatchObject({ fontSize: "22px", live: 1.5 });
  // 작게 해도 안쪽 여백은 최소값(×·손잡이가 글자와 겹치지 않게 · 끝 글자가 테두리에 닿지 않게)
  expect(textBoxSizeOf(0.5, 0.5)).toMatchObject({ fontSize: "11px", padding: "8px 14px", live: 1 });
});

test("MS-U47. 끝단 — 크기는 가장 긴 줄이 바탕 폭(좌우 36 여백) 안에 들 때까지만(서버 상한 3과 둘 중 작은 값), 자리는 상자 · 손잡이가 바탕 안에 남게", () => {
  const ko = "오늘 처음 김치찌개 만들었어"; // 가장 긴 줄 「오늘 처음 김치찌개」 8.6칸 × 22 = 189.2px, 두 줄
  const canvas = { width: 390, height: 700 };
  const at = (scale: number, x: number, y: number) => ({ scale, x, y });
  // 390 폭: (390 − 72 − 28) / 189.2 ≈ 1.533
  expect(textFit(ko, at(3, 0.5, 0.5), canvas).scale).toBeCloseTo(1.533, 3);
  expect(textFit("안녕", at(3, 0.5, 0.5), canvas).scale).toBe(3); // 짧은 글은 서버 상한 3
  // 끝으로 끌면 상자 반폭(반높이) + 여백만큼 안쪽에 멈춤
  const corner = textFit(ko, at(1, 1, 1), canvas);
  expect(corner.scale).toBe(1);
  expect(corner.x).toBeCloseTo(1 - (189.2 + 28) / 2 / 390 - 36 / 390, 3);
  expect(corner.y).toBeCloseTo(1 - (2 * 28 + 16) / 2 / 700 - 36 / 700, 3);
  expect(textFit(ko, at(1, 0, 0), canvas).x).toBeCloseTo((189.2 + 28) / 2 / 390 + 36 / 390, 3);
  expect(textFit(ko, at(1, 0.4, 0.3), canvas)).toEqual({ scale: 1, x: 0.4, y: 0.3 });
  // 바탕 크기를 아직 모르면 그대로
  expect(textFit(ko, at(2, 0.9, 0.9), { width: 0, height: 0 })).toEqual(at(2, 0.9, 0.9));
});
