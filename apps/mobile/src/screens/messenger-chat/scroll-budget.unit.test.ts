import { describe, expect, test } from "vitest";

import {
  MIN_SCROLL_PX,
  outPanelMaxHeightOf,
  scrollBodyHeightOf,
  sheetMaxHeightOf,
} from "./scroll-budget";

// `unit` 계층(접근성 C1 · M1): 큰 글자에서 시트 · T3 판이 화면 밖으로 넘치지 않게 하는 px 예산 — 판 최대 높이 · 스크롤 칸 높이.

describe("sheetMaxHeightOf", () => {
  test("화면 높이 − 상태 바 − 24 이다(위 24px은 늘 막으로 남는다)", () => {
    expect(sheetMaxHeightOf({ screenHeight: 667, insetTop: 20 })).toBe(623);
  });
  test("화면 높이를 모르면(NaN) null이다 — 상한을 걸지 않는다", () => {
    expect(sheetMaxHeightOf({ screenHeight: Number.NaN, insetTop: 20 })).toBeNull();
  });
});

describe("outPanelMaxHeightOf", () => {
  test("화면 − 상태 바 − 머리 − 96 이다(로그가 최소 96은 남는다) — 머리는 max(72, 42 × 배율 + 24)", () => {
    expect(outPanelMaxHeightOf({ screenHeight: 667, insetTop: 20, fontScale: null })).toBe(479);
    expect(outPanelMaxHeightOf({ screenHeight: 667, insetTop: 20, fontScale: 2 })).toBe(443);
  });
  test("F3. AX5(3.1)에서 머리는 제목 · 부제 한 줄씩이라 네 줄 때(224)보다 작게 잡는다", () => {
    expect(outPanelMaxHeightOf({ screenHeight: 667, insetTop: 20, fontScale: 3.1 })).toBe(396);
  });
  test("배율이 1보다 작아도 머리는 줄지 않는다", () => {
    expect(outPanelMaxHeightOf({ screenHeight: 667, insetTop: 20, fontScale: 0.8 })).toBe(479);
  });
  test("화면 높이를 모르면 null이다", () => {
    expect(outPanelMaxHeightOf({ screenHeight: Number.NaN, insetTop: 0, fontScale: 1 })).toBeNull();
  });
});

describe("scrollBodyHeightOf", () => {
  test("재지 못한 값이 하나라도 있으면 null이다 — 높이를 강제하지 않는다", () => {
    expect(scrollBodyHeightOf({ max: null, fixed: 200, content: 300 })).toBeNull();
    expect(scrollBodyHeightOf({ max: 600, fixed: null, content: 300 })).toBeNull();
    expect(scrollBodyHeightOf({ max: 600, fixed: 200, content: null })).toBeNull();
  });
  test("내용이 들어가면 내용 높이 그대로다(스크롤 없음)", () => {
    expect(scrollBodyHeightOf({ max: 600, fixed: 200, content: 300 })).toBe(300);
  });
  test("내용이 넘치면 남는 높이(최대 − 고정부)로 자른다(스크롤)", () => {
    expect(scrollBodyHeightOf({ max: 600, fixed: 200, content: 900 })).toBe(400);
  });
  test("고정부가 너무 커도 최소 높이는 남긴다", () => {
    expect(scrollBodyHeightOf({ max: 600, fixed: 590, content: 900 })).toBe(MIN_SCROLL_PX);
  });
});
