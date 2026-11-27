import { describe, expect, test } from "vitest";

import { syllableDiff } from "./syllable-diff";

// `unit` 계층: 말하기 결과의 「다른 음절」 표시(ADR-0201 D6). 순수 함수.

const marked = (pieces: readonly { text: string; differs: boolean }[]) =>
  pieces.map((piece) => (piece.differs ? `[${piece.text}]` : piece.text)).join("");

describe("SD1 음절 차이", () => {
  test.each([
    ["카트", "카드", "카[트]", "카[드]"],
    ["카페", "카드", "카[페]", "카[드]"],
    ["카드", "카드", "카드", "카드"],
    ["현금으로 할게요", "카드로 할게요.", "[현금으]로 할게요", "[카드]로 할게요."],
    ["안녕히 계세요", "안녕히 가세요", "안녕히 [계]세요", "안녕히 [가]세요"],
    ["카드 주세요", "카드", "카드 [주세요]", "카드"],
    ["", "카드", "", "[카드]"],
    ["사과", "", "[사과]", ""],
  ])("「%s」 ↔ 「%s」", (heard, expected, heardMarked, expectedMarked) => {
    const diff = syllableDiff(heard, expected);
    expect(marked(diff.heard)).toBe(heardMarked);
    expect(marked(diff.expected)).toBe(expectedMarked);
  });

  test("띄어쓰기 · 부호는 다름으로 표시하지 않는다", () => {
    const diff = syllableDiff("비밀 번호", "비밀번호!");
    expect(diff.heard.every((piece) => !piece.differs)).toBe(true);
    expect(diff.expected.every((piece) => !piece.differs)).toBe(true);
  });

  test("이웃한 같은 표시는 한 조각이다", () => {
    expect(syllableDiff("카트", "카드").expected).toEqual([
      { text: "카", differs: false },
      { text: "드", differs: true },
    ]);
  });
});
