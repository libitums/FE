import { describe, expect, test } from "vitest";

import { composeHangul } from "../../lib/hangul-keyboard";
import { keysFromText } from "./composer-keys";

// `unit` 계층(MC-U5): 글 → 학습 키보드 자모 열 되감기(spec §5.3). 계약: composeHangul(keysFromText(t)) === t.

const roundTrip: readonly (readonly [string, string])[] = [
  ["인사", "안녕하세요"],
  ["쌍자음 빵", "빵"],
  ["쌍자음 꽃", "꽃"],
  ["ㅒ 음절", "얘"],
  ["ㅖ 음절", "예"],
  ["ㅒ 홑자모", "ㅒ"],
  ["ㅖ 홑자모", "ㅖ"],
  ["겹모음 왜", "왜"],
  ["겹모음 의", "의"],
  ["겹받침 닭", "닭"],
  ["겹받침 앉", "앉"],
  ["미완성 끝 자음", "안녕ㅎ"],
  ["미완성 홑모음", "ㅏ"],
  ["띄어쓰기", "안녕 하세요  네"],
  ["영어", "hello World"],
  ["숫자", "0123 456"],
  ["이모지", "좋아요 😀👍"],
  ["빈 문자열", ""],
];

describe("keysFromText 왕복", () => {
  test.each(roundTrip.map(([label, text]) => [label, text] as const))(
    "MC-U5. %s: composeHangul(keysFromText(t)) === t",
    (_label, text) => {
      expect(composeHangul(keysFromText(text))).toBe(text);
    },
  );

  test("MC-U5. 빈 문자열은 빈 열이다", () => {
    expect(keysFromText("")).toEqual([]);
  });

  test("MC-U5. 윗글쇠는 열에 남지 않는다 — 'shift' 키가 없고 쌍자음은 한 키다", () => {
    const keys = keysFromText("빵꽃");
    expect(keys).not.toContain("shift");
    expect(keys).toContain("ㅃ");
    expect(keys).toContain("ㄲ");
  });

  test("MC-U5. 띄어쓰기는 'space' 가 아니라 공백 한 칸이다", () => {
    const keys = keysFromText("가 나");
    expect(keys).not.toContain("space");
    expect(keys).toContain(" ");
  });
});

describe("이어 치기", () => {
  test("MC-U5. 「안녕하」 열 + ㅅ → 「안녕핫」", () => {
    expect(composeHangul([...keysFromText("안녕하"), "ㅅ"])).toBe("안녕핫");
  });

  test("MC-U5. 「안녕하」 열 + ㅅ, ㅔ → 「안녕하세」", () => {
    expect(composeHangul([...keysFromText("안녕하"), "ㅅ", "ㅔ"])).toBe("안녕하세");
  });

  test("MC-U5. 겹받침 「닭」 열 + ㅏ → 받침 하나가 다음 음절로 넘어간다", () => {
    expect(composeHangul([...keysFromText("닭"), "ㅏ"])).toBe("달가");
  });
});
