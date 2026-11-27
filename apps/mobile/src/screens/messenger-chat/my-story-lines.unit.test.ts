import { expect, test } from "vitest";

import { typedText } from "./my-story-editor";
import { placedFit } from "./my-story-fit";
import { storyTextOf, TEXT_LINES_MAX } from "./my-story-lines";
import { storyTextLines, textBoxPx, textFit } from "./my-story-text";

// `unit` 계층(ST-U5 ~ U8, 버그 수정 2026-11-27): 글 상자 줄바꿈 — 사용자가 친 줄바꿈을 지켜 편집 · 보기가 같은 줄로 그린다. 그리고 바탕
// 위 자리는 화면 전체에 대한 비율이라(보기와 같은 좌표), 위 줄 · 아래 줄이 가리는 몫(`top` · `bottom`)은 끝단에서만 뺀다.

test("ST-U5. 쓴 글 정리 — 줄바꿈은 지키고, 줄마다 앞뒤 공백 · 빈 줄 · CR은 지우고, 줄 수 상한을 넘는 줄은 마지막 줄에 띄어 붙임", () => {
  expect(storyTextOf("오늘\n김치찌개")).toBe("오늘\n김치찌개");
  expect(storyTextOf("  오늘 \r\n\n\n  김치찌개  \n")).toBe("오늘\n김치찌개");
  expect(storyTextOf(" \n \n")).toBe("");
  expect(TEXT_LINES_MAX).toBe(8);
  const many = Array.from({ length: 10 }, (_, i) => `${i + 1}`).join("\n");
  expect(storyTextOf(many)).toBe("1\n2\n3\n4\n5\n6\n7\n8 9 10");
});

test("ST-U6. 글 상자 마침 — 줄바꿈이 있는 글을 그대로 놓는다", () => {
  expect(typedText("오늘\n처음 만든 김치찌개\n", "brown", null)?.ko).toBe(
    "오늘\n처음 만든 김치찌개",
  );
  expect(typedText("\n \n", "brown", null)).toBeNull();
});

test("ST-U7. 줄 나누기 — 친 줄바꿈에서 먼저 나누고, 그 줄이 폭을 넘으면 띄어쓰기로 다시 나눈다", () => {
  expect(storyTextLines("오늘\n김치찌개")).toEqual(["오늘", "김치찌개"]);
  expect(storyTextLines("짧게\n오늘 처음 김치찌개 만들었어")).toEqual([
    "짧게",
    "오늘 처음 김치찌개",
    "만들었어",
  ]);
  // 상자 높이는 줄 수를 따른다(28 × 2 + 위아래 여백 16 + 테두리 4), 폭은 가장 긴 줄(4자 × 22 + 28 + 4)
  expect(textBoxPx("오늘\n김치찌개", 1)).toEqual({ width: 120, height: 76 });
});

test("ST-U8. 끝단 — 바탕이 화면 전체 · 위 줄(top) · 아래 줄(bottom) 위로도 가지만, 가려지지 않는 곳에 상자가 32px 남는다(2026-11-27)", () => {
  const canvas = { width: 390, height: 844, top: 120, bottom: 160 };
  const box = () => ({ width: 100, height: 40 });
  const up = placedFit(box, { scale: 1, x: 0.5, y: 0, rotation: 0 }, canvas);
  expect(up.y).toBeCloseTo((120 + 32 - 20) / 844, 3);
  const down = placedFit(box, { scale: 1, x: 0.5, y: 1, rotation: 0 }, canvas);
  expect(down.y).toBeCloseTo(1 - (160 + 32 - 20) / 844, 3);
  // 크기 상한은 그대로 — 세운 상자(90°) 높이 ≤ 844 − 120 − 160 − 72
  const tall = textFit(
    "오늘 처음 김치찌개 만들었어",
    { scale: 3, x: 0.5, y: 0.5, rotation: 90 },
    canvas,
  );
  expect(tall.scale).toBeCloseTo((844 - 120 - 160 - 72 - 4) / 213.2, 2);
  // top · bottom이 없으면 화면 끝까지 — 높이 40의 낮은 상자는 화면 안에 32px(가운데가 끝에서 12px)
  expect(
    placedFit(box, { scale: 1, x: 0.5, y: 0, rotation: 0 }, { width: 390, height: 700 }).y,
  ).toBeCloseTo((32 - 20) / 700, 3);
});
