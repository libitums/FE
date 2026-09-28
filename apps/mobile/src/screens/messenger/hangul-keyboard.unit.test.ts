import { describe, expect, test } from "vitest";

import {
  composeHangul,
  isTypedAnswerCorrect,
  keystrokesFor,
  maskedAnswer,
} from "./hangul-keyboard";

const jamo = (text: string) => [...text];

describe("composeHangul", () => {
  test.each([
    ["ㅈㅜㅅㅔㅇㅛ", "주세요"],
    ["ㄱㅏㄴㅏ", "가나"],
    ["ㄱㅗㅏ", "과"],
    ["ㅇㅏㄴㅈ", "앉"],
    ["ㅇㅏㄴㅈㅏ", "안자"],
    ["ㄷㅏㄹㄱ", "닭"],
    ["ㄷㅏㄹㄱㅇㅣ", "닭이"],
    ["ㄱㅏㄱㅏ", "가가"],
    ["ㅂㅗㅐㅇㅛ", "봬요"],
    ["ㄱㅏㄸ", "가ㄸ"],
    ["ㄱ", "ㄱ"],
    ["ㅏ", "ㅏ"],
    ["ㅏㅏ", "ㅏㅏ"],
    ["ㄱㄴ", "ㄱㄴ"],
    ["ㅇㅡㅣㅅㅏ", "의사"],
  ])("%s → %s", (keys, expected) => {
    expect(composeHangul(jamo(keys))).toBe(expected);
  });

  test("공백 · 문장 부호는 조합을 끊고 그대로 붙는다", () => {
    expect(composeHangul([..."ㄴㅔ", ",", " ", ..."ㅈㅗㅎㅇㅏㅇㅛ", "."])).toBe("네, 좋아요.");
  });

  test("받침 뒤 자음은 새 음절을 연다", () => {
    expect(composeHangul(jamo("ㅎㅏㄴㄱㅡㄹ"))).toBe("한글");
  });
});

describe("keystrokesFor", () => {
  test("겹자음 · ㅒ · ㅖ 앞에 윗글쇠를 둔다", () => {
    expect(keystrokesFor("까")).toEqual(["shift", "ㄱ", "ㅏ"]);
    expect(keystrokesFor("얘")).toEqual(["ㅇ", "shift", "ㅐ"]);
  });

  test("겹모음 · 겹받침은 두 키로 푼다", () => {
    expect(keystrokesFor("와")).toEqual(["ㅇ", "ㅗ", "ㅏ"]);
    expect(keystrokesFor("닭")).toEqual(["ㄷ", "ㅏ", "ㄹ", "ㄱ"]);
  });

  test("띄어쓰기는 space 키다", () => {
    expect(keystrokesFor("가 나")).toEqual(["ㄱ", "ㅏ", "space", "ㄴ", "ㅏ"]);
  });

  test.each([
    "주세요",
    "고마워요",
    "봬요",
    "좋아요",
    "얘기해요",
    "앉아요",
    "읽었어요",
    "쌀",
    "괜찮아요",
  ])("조합하면 원문이 돌아온다: %s", (text) => {
    const shifted: Record<string, string> = {
      ㅂ: "ㅃ",
      ㅈ: "ㅉ",
      ㄷ: "ㄸ",
      ㄱ: "ㄲ",
      ㅅ: "ㅆ",
      ㅐ: "ㅒ",
      ㅔ: "ㅖ",
    };
    const keys: string[] = [];
    let shift = false;
    for (const stroke of keystrokesFor(text)) {
      if (stroke === "shift") {
        shift = true;
        continue;
      }
      keys.push(shift ? (shifted[stroke] ?? stroke) : stroke === "space" ? " " : stroke);
      shift = false;
    }
    expect(composeHangul(keys)).toBe(text);
  });
});

describe("isTypedAnswerCorrect", () => {
  test("띄어쓰기 · 문장 부호를 보지 않는다", () => {
    expect(isTypedAnswerCorrect("좋아요", "좋아요!")).toBe(true);
    expect(isTypedAnswerCorrect("네 고마워요", "네, 고마워요!")).toBe(true);
  });

  test("NFD(첫가끝 자모)로 적힌 정답도 완성형 입력과 같다", () => {
    expect(isTypedAnswerCorrect("좋아요", "좋아요!".normalize("NFD"))).toBe(true);
  });

  test("말이 다르면 틀린다", () => {
    expect(isTypedAnswerCorrect("조아요", "좋아요!")).toBe(false);
    expect(isTypedAnswerCorrect("좋아", "좋아요!")).toBe(false);
  });

  test("빈 입력 · 문장 부호뿐인 입력은 맞지 않는다", () => {
    expect(isTypedAnswerCorrect("", "!")).toBe(false);
    expect(isTypedAnswerCorrect(" . ", "!")).toBe(false);
  });
});

describe("maskedAnswer", () => {
  test("한글 음절은 초성으로, 나머지는 그대로 둔다", () => {
    expect(maskedAnswer("좋아요!")).toBe("ㅈㅇㅇ!");
    expect(maskedAnswer("네, 고마워요!")).toBe("ㄴ, ㄱㅁㅇㅇ!");
    expect(maskedAnswer("꽃 2개")).toBe("ㄲ 2ㄱ");
  });
});
