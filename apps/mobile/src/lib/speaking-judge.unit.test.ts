import { describe, expect, test } from "vitest";

import { speakingChunks, speakingWords } from "./speaking-judge";

// `unit` 계층: 문장을 부호가 붙은 채의 보이는 조각으로 자르고 맞은 낱말 수만큼 칠하는 규칙만 봅니다.

describe("speakingChunks", () => {
  test("CH1. 부호를 지우지 않고 공백으로만 자른다", () => {
    expect(speakingChunks("아니요, 괜찮아요.", 0)).toEqual([
      { text: "아니요,", matched: false },
      { text: "괜찮아요.", matched: false },
    ]);
  });

  test("CH1. 다섯 낱말 의문문은 조각 다섯이고 마지막이 부호를 단다", () => {
    const chunks = speakingChunks("미나 씨는 어느 나라에서 왔어요?", 0);

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "미나",
      "씨는",
      "어느",
      "나라에서",
      "왔어요?",
    ]);
  });

  test("CH2. 맞은 수만큼 앞 조각부터 칠한다", () => {
    expect(speakingChunks("아니요, 괜찮아요.", 1).map((chunk) => chunk.matched)).toEqual([
      true,
      false,
    ]);
    expect(speakingChunks("아니요, 괜찮아요.", 2).map((chunk) => chunk.matched)).toEqual([
      true,
      true,
    ]);
  });

  test("CH2. 맞은 수가 낱말 수보다 커도 던지지 않고 전부 칠한다", () => {
    expect(speakingChunks("아니요, 괜찮아요.", 99).map((chunk) => chunk.matched)).toEqual([
      true,
      true,
    ]);
  });

  test("CH3. 부호만 있는 조각은 앞 조각과 함께 칠한다", () => {
    expect(speakingChunks("네 … 좋아요", 1)).toEqual([
      { text: "네", matched: true },
      { text: "…", matched: true },
      { text: "좋아요", matched: false },
    ]);
  });

  test("CH3. 맨 앞 부호 조각은 맞은 수가 0이면 칠하지 않는다", () => {
    expect(speakingChunks("… 네", 0).map((chunk) => chunk.matched)).toEqual([false, false]);
  });

  test("CH3. 연속 공백과 앞뒤 공백은 빈 조각을 만들지 않는다", () => {
    expect(speakingChunks("  카드로    할게요.  ", 0).map((chunk) => chunk.text)).toEqual([
      "카드로",
      "할게요.",
    ]);
  });

  test("CH4. 부호 없는 튜토리얼 문장은 조각 글자가 speakingWords와 같다", () => {
    const sentence = "제 이름은 민수예요";

    expect(speakingChunks(sentence, 0).map((chunk) => chunk.text)).toEqual(speakingWords(sentence));
  });
});
