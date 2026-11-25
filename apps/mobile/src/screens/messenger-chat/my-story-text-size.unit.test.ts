import { expect, test } from "vitest";

import { storyTextLines, textBoxSizeOf } from "./my-story-editor";

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
    padding: "8px 12px",
    live: 1,
  });
  expect(textBoxSizeOf(2, 2)).toMatchObject({ fontSize: "44px", lineHeight: "56px", live: 1 });
  // 끄는 중: 확정 1, 지금 1.5 → 글자는 그대로, transform 1.5
  expect(textBoxSizeOf(1.5, 1)).toMatchObject({ fontSize: "22px", live: 1.5 });
  expect(textBoxSizeOf(0.5, 0.5)).toMatchObject({ fontSize: "11px", padding: "4px 6px", live: 1 });
});
