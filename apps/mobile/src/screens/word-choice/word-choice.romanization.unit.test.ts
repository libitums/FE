import { describe, expect, it } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { optionAccessibilityLabel } from "./word-choice";

// `unit` 계층: 보기 낭독 이름의 순서 `한글, 로마자[, 뜻][, 판정]`만 봅니다(순수 함수의 입출력).

describe("optionAccessibilityLabel — 로마자 (WT3)", () => {
  const roman = "annyeonghaseyo";

  it("WT3. 로마자는 한글 뒤에 쉼표 + 공백으로 붙는다", () => {
    expect(optionAccessibilityLabel("안녕하세요", null, uiCopyEn, undefined, roman)).toBe(
      "안녕하세요, Pronunciation: annyeonghaseyo",
    );
  });

  it("WT3. 번역이 같이 있으면 한글, 로마자, 뜻 순서다", () => {
    expect(optionAccessibilityLabel("안녕하세요", null, uiCopyEn, "Hello", roman)).toBe(
      "안녕하세요, Pronunciation: annyeonghaseyo, Hello",
    );
  });

  it("WT3. 판정은 맨 끝에 붙는다", () => {
    expect(optionAccessibilityLabel("안녕하세요", "correct", uiCopyEn, undefined, roman)).toBe(
      "안녕하세요, Pronunciation: annyeonghaseyo, correct",
    );
    expect(optionAccessibilityLabel("안녕하세요", "incorrect", uiCopyEn, "Hello", roman)).toBe(
      "안녕하세요, Pronunciation: annyeonghaseyo, Hello, incorrect",
    );
  });

  it("WT3. 로마자가 없으면 지금 값 그대로다(WT1 · WT2 유지)", () => {
    expect(optionAccessibilityLabel("안녕하세요", null, uiCopyEn)).toBe("안녕하세요");
    expect(optionAccessibilityLabel("안녕하세요", null, uiCopyEn, "Hello")).toBe(
      "안녕하세요, Hello",
    );
    expect(optionAccessibilityLabel("안녕하세요", "correct", uiCopyEn, "Hello")).toBe(
      "안녕하세요, Hello, correct",
    );
  });
});
