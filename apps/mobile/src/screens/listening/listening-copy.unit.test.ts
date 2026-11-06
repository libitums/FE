import { describe, expect, it } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { choiceAccessibilityLabel } from "./listening-copy";

// `unit` 계층: 듣기 보기 낭독 이름의 순서 `한글, 로마자[, 판정]`만 봅니다(순수 함수의 입출력).

describe("choiceAccessibilityLabel — 로마자 (CR12)", () => {
  it("CR12. 로마자가 있으면 한글, 로마자 순서이고 판정은 끝에 붙는다", () => {
    expect(choiceAccessibilityLabel("가요.", null, uiCopyEn, "gayo.")).toBe(
      "가요., Pronunciation: gayo.",
    );
    expect(choiceAccessibilityLabel("가요.", "correct", uiCopyEn, "gayo.")).toBe(
      "가요., Pronunciation: gayo., correct",
    );
    expect(choiceAccessibilityLabel("가요.", "incorrect", uiCopyEn, "gayo.")).toBe(
      "가요., Pronunciation: gayo., incorrect",
    );
  });

  it("CR12. 로마자가 없으면 지금 값 그대로다 — 답 전에는 판정 접미사가 없다", () => {
    expect(choiceAccessibilityLabel("가요.", null, uiCopyEn)).toBe("가요.");
    expect(choiceAccessibilityLabel("가요.", "correct", uiCopyEn)).toBe("가요., correct");
  });
});
