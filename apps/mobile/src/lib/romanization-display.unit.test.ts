import { describe, expect, test } from "vitest";

import { bubbleLinesOf, readingOf } from "./romanization-display";

// `unit` 계층(ADR-0188 D1 · D3): 대화 줄의 읽기 원천과 말풍선 아래 줄 갈래만 봅니다.

const pronunciation = (romanization: string) => `Pronunciation: ${romanization}`;

describe("readingOf", () => {
  test("RD1. 콘텐츠 로마자가 있으면 그것을 trim해 쓴다 — 변환하지 않는다", () => {
    expect(readingOf("같이 가요", "  gati gayo ")).toBe("gati gayo");
  });

  test.each([[undefined], [null], [""], ["   "]])(
    "RD2. 콘텐츠 로마자가 없거나 비면(%j) 한글을 변환한다",
    (roman) => {
      expect(readingOf("같이 가요", roman)).toBe("gachi gayo");
    },
  );

  test.each([["OK!"], [""], ["123"]])("RD3. 한글이 없고 로마자도 없으면(%j) null이다", (ko) => {
    expect(readingOf(ko, undefined)).toBeNull();
  });
});

describe("bubbleLinesOf", () => {
  test("RD4. 켬 · 읽기와 뜻이 있으면 로마자 · 뜻 묶음(낭독은 Pronunciation 접두)", () => {
    expect(
      bubbleLinesOf({ ko: "안녕", roman: "annyeong", meaning: "Hi" }, "shown", pronunciation),
    ).toEqual({
      annotation: {
        romanization: "annyeong",
        meaning: "Hi",
        spokenRomanization: "Pronunciation: annyeong",
      },
    });
  });

  test("RD5. 켬 · 뜻이 없으면 아무 줄도 없다 — 로마자를 번역 자리에 싣지 않는다(모양 · 낭독 접두가 어긋남)", () => {
    expect(
      bubbleLinesOf({ ko: "안녕", roman: "annyeong", meaning: "" }, "shown", pronunciation),
    ).toEqual({});
  });

  test("RD6. 끔이면 뜻 한 줄, 뜻이 없으면 아무 줄도 없다 — 이 변경 전 모양", () => {
    expect(
      bubbleLinesOf({ ko: "안녕", roman: "annyeong", meaning: "Hi" }, "hidden", pronunciation),
    ).toEqual({ translation: "Hi" });
    expect(bubbleLinesOf({ ko: "안녕", roman: "annyeong" }, "hidden", pronunciation)).toEqual({});
  });

  test("RD7. 켬이어도 한글 · 로마자가 없으면 뜻만 선다", () => {
    expect(bubbleLinesOf({ ko: "OK", meaning: "Okay" }, "shown", pronunciation)).toEqual({
      translation: "Okay",
    });
  });
});
