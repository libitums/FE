import { describe, expect, test } from "vitest";

import { romanizeHangul } from "./hangul-romanize.test-support";

// `unit` 계층: 나라 표의 로마자를 판정하는 규칙 함수의 입출력만 봅니다 — 국어의 로마자 표기법(2000),
// 표준 발음, 소문자.

describe("romanizeHangul", () => {
  test.each([
    ["독일", "dogil"],
    ["미국", "miguk"],
    ["한국", "hanguk"],
    ["북한", "bukhan"],
    ["핀란드", "pillandeu"],
    ["아일랜드", "aillaendeu"],
    ["네덜란드", "nedeollandeu"],
    ["북마케도니아", "bungmakedonia"],
    ["룩셈부르크", "ruksembureukeu"],
    ["앙골라", "anggolla"],
    ["남아프리카공화국", "namapeurikagonghwaguk"],
    ["중앙아프리카공화국", "jungangapeurikagonghwaguk"],
    ["아랍에미리트", "arabemiriteu"],
    ["튀르키예", "twireukiye"],
    ["적도기니", "jeokdogini"],
  ])("RM-1. 고정 예: %s -> %s", (word, expected) => {
    expect(romanizeHangul(word)).toBe(expected);
  });

  test.each([
    ["받침 + 모음은 연음이다", "독일", "dogil"],
    ["받침 k + ㄴ/ㅁ은 비음화다", "북마케도니아", "bungmakedonia"],
    ["ㄴ + ㄹ은 유음화로 ll이다", "핀란드", "pillandeu"],
    ["ㄹ + ㄴ도 ll이다", "아일랜드", "aillaendeu"],
    ["받침 ㅇ + ㄹ 앞은 ng이고 ㄹ은 그대로 l이다", "앙골라", "anggolla"],
    ["ㄹ 받침 + ㄹ 초성은 ll이다", "칠레", "chille"],
    ["ㄱ 받침 + ㅎ은 밝혀 적는다", "북한", "bukhan"],
    ["받침 ㅇ + 모음은 ng를 그대로 적고 이어 읽지 않는다", "중앙아프리카", "jungangapeurika"],
  ])("RM-2. 경계 규칙: %s", (_rule, word, expected) => {
    expect(romanizeHangul(word)).toBe(expected);
  });

  test("RM-3. 한글 음절이 아닌 글자가 있으면 던진다", () => {
    expect(() => romanizeHangul("A")).toThrow(/.+/);
    expect(() => romanizeHangul("한 국")).toThrow(/.+/);
    expect(() => romanizeHangul("한국1")).toThrow(/.+/);
  });
});
