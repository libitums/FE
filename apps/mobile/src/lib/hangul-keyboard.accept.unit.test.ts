import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import * as messengerKeyboard from "../screens/messenger/hangul-keyboard";
import * as libKeyboard from "./hangul-keyboard";
import { isTypeableAnswer, isTypedAnswerAccepted } from "./hangul-keyboard";

// `unit` 계층: 정답 목록 판정과 치기 가능 판정, 자판 모듈 이동의 입출력만 봅니다.

describe("isTypeableAnswer", () => {
  test.each([
    ["여권 여기 있어요.", true],
    ["체크아웃은 오전 11시 맞죠?", false],
    ["OK 좋아요", false],
    ["!?", false],
    ["", false],
  ] as const)("HK1. %j → %s", (answer, expected) => {
    expect(isTypeableAnswer(answer)).toBe(expected);
  });
});

describe("isTypedAnswerAccepted", () => {
  const answers = ["여권 여기 있어요.", "여권 여기 있어요"] as const;

  test("HK2. 공백 · 문장 부호를 보지 않고 목록 중 하나와 같은 말이면 받아들인다", () => {
    expect(isTypedAnswerAccepted("여권여기있어요", answers)).toBe(true);
  });

  test("HK2. 둘째 정답만 맞아도 받아들인다", () => {
    expect(
      isTypedAnswerAccepted("저는 학생이에요", ["여권 여기 있어요.", "저는 학생이에요."]),
    ).toBe(true);
  });

  test("HK2. 목록이 비면 받아들이지 않고 다른 말도 받아들이지 않는다", () => {
    expect(isTypedAnswerAccepted("여권여기있어요", [])).toBe(false);
    expect(isTypedAnswerAccepted("여권 여기", answers)).toBe(false);
    expect(isTypedAnswerAccepted("", answers)).toBe(false);
  });
});

describe("메신저 자판 경로", () => {
  test("HK3. 옛 경로는 새 모듈을 재수출하는 한 줄뿐이다", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/messenger/hangul-keyboard.ts"),
      "utf8",
    );
    const code = source
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("*"))
      .filter((line) => !line.startsWith("/*"));

    expect(code).toEqual(['export * from "../../lib/hangul-keyboard";']);
  });

  test("HK4. 옛 경로의 export는 새 모듈의 같은 함수 참조다", () => {
    const oldKeys = Object.keys(messengerKeyboard);
    const newKeys = new Set(Object.keys(libKeyboard));

    expect(oldKeys.length).toBeGreaterThan(0);
    for (const key of oldKeys) {
      expect(newKeys.has(key)).toBe(true);
      expect(Reflect.get(messengerKeyboard, key)).toBe(Reflect.get(libKeyboard, key));
    }
  });
});
