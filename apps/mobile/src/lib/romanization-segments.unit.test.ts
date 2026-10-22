import { describe, expect, test } from "vitest";

import { clozeRomanizationOf, romanizationSegmentsOf } from "./romanization-segments";

describe("clozeRomanizationOf (RS1 ~ RS3)", () => {
  test("RS1: u00 S6 실데이터 — 빈칸을 정답 로마자로 채우고 그 범위를 낸다", () => {
    expect(clozeRomanizationOf("___ hangugeun cheoeumiseyo?", "annyeonghaseyo!")).toEqual({
      text: "annyeonghaseyo! hangugeun cheoeumiseyo?",
      emphasis: { start: 0, length: 15 },
    });
  });

  test("RS2: 빈칸이 가운데나 끝에 있어도 범위가 맞고, 두 번이면 첫 자리만 채운다", () => {
    expect(clozeRomanizationOf("na neun ___ imnida", "minseo")).toEqual({
      text: "na neun minseo imnida",
      emphasis: { start: 8, length: 6 },
    });
    expect(clozeRomanizationOf("jeo neun ___", "minseo")).toEqual({
      text: "jeo neun minseo",
      emphasis: { start: 9, length: 6 },
    });
    expect(clozeRomanizationOf("___ gwa ___", "a")).toEqual({
      text: "a gwa ___",
      emphasis: { start: 0, length: 1 },
    });
  });

  test("RS3: 빈칸이 없거나 정답 로마자가 없거나 비면 문맥 그대로이고 강조가 없다", () => {
    const noBlank = clozeRomanizationOf("annyeong", "x");
    expect(noBlank.text).toBe("annyeong");
    expect(noBlank).not.toHaveProperty("emphasis");

    const noAnswer = clozeRomanizationOf("___ hangugeun", undefined);
    expect(noAnswer.text).toBe("___ hangugeun");
    expect(noAnswer).not.toHaveProperty("emphasis");

    const blankAnswer = clozeRomanizationOf("___ hangugeun", "   ");
    expect(blankAnswer.text).toBe("___ hangugeun");
    expect(blankAnswer).not.toHaveProperty("emphasis");
  });
});

describe("romanizationSegmentsOf (RS4)", () => {
  test("강조 범위로 앞, 가운데, 뒤 조각을 만든다", () => {
    expect(romanizationSegmentsOf("annyeonghaseyo! hangugeun", { start: 0, length: 15 })).toEqual([
      { text: "annyeonghaseyo!", emphasis: "answer" },
      { text: " hangugeun", emphasis: "none" },
    ]);
    expect(romanizationSegmentsOf("na neun minseo imnida", { start: 8, length: 6 })).toEqual([
      { text: "na neun ", emphasis: "none" },
      { text: "minseo", emphasis: "answer" },
      { text: " imnida", emphasis: "none" },
    ]);
  });

  test("범위가 없거나 밖이거나 길이 0이면 강조 없는 한 조각이다", () => {
    const whole = [{ text: "annyeong", emphasis: "none" }];
    expect(romanizationSegmentsOf("annyeong", undefined)).toEqual(whole);
    expect(romanizationSegmentsOf("annyeong", { start: 20, length: 3 })).toEqual(whole);
    expect(romanizationSegmentsOf("annyeong", { start: 4, length: 10 })).toEqual(whole);
    expect(romanizationSegmentsOf("annyeong", { start: -1, length: 3 })).toEqual(whole);
    expect(romanizationSegmentsOf("annyeong", { start: 2, length: 0 })).toEqual(whole);
  });
});
