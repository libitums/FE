import { describe, expect, it } from "vitest";

import { wordChoiceSpokenText } from "./word-choice";

// 빈칸 문항의 낭독 문장입니다 — 밑줄 줄은 보조기술 기본 설정에서 읽히지 않아, 빈칸이 있는 줄은
// 밑줄 대신 「빈칸」 낱말로 읽혀야 합니다. 낱말은 문구표가 주고, 여기서는 인자로 넣습니다.
describe("wordChoiceSpokenText", () => {
  it("BL1. 낱말 뒤에 붙은 빈칸을 낱말과 떼어 빈칸 낱말로 바꾼다", () => {
    expect(wordChoiceSpokenText("카드___ 할게요.", "blank")).toBe("카드 blank 할게요.");
  });

  it("BL2. 문장 앞 빈칸과 뒤에 붙은 조사도 떼어 읽는다", () => {
    expect(wordChoiceSpokenText("___로 할게요.", "blank")).toBe("blank 로 할게요.");
  });

  it("BL3. 로마자 줄도 같은 규칙이다", () => {
    expect(wordChoiceSpokenText("kadeu___ halgeyo.", "blank")).toBe("kadeu blank halgeyo.");
  });

  it("BL4. 빈칸이 없으면 그대로다", () => {
    expect(wordChoiceSpokenText("삼천 원입니다.", "blank")).toBe("삼천 원입니다.");
  });

  it("BL5. 밑줄 하나는 빈칸이 아니다", () => {
    expect(wordChoiceSpokenText("a_b", "blank")).toBe("a_b");
  });
});
