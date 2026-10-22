import { describe, expect, test } from "vitest";

import { listeningQuestionDensityOf, listeningScriptOf, type ListeningQuestion } from "./listening";

// `unit` 계층: 듣기 제시의 대본 갈래와 문항 밀도를 정하는 순수 함수의 입출력만 봅니다.

function questionOf(prompt: string): ListeningQuestion {
  return {
    prompt,
    romanization: "r",
    audio: null,
    choices: ["가", "나"],
    answerIndex: 0,
  };
}

describe("listeningScriptOf (LP1)", () => {
  test.each([
    ["romanization", false, false, "romanization"],
    ["romanization", true, false, "full"],
    ["romanization", false, true, "full"],
    ["romanization", true, true, "full"],
    ["nothing", false, false, "none"],
    ["nothing", true, false, "full"],
    ["nothing", false, true, "full"],
    ["nothing", true, true, "full"],
  ] as const)(
    "beforeAnswer %s · showTranscript %s · revealed %s → %s",
    (beforeAnswer, showTranscript, revealed, expected) => {
      expect(listeningScriptOf({ beforeAnswer, showTranscript, revealed })).toBe(expected);
    },
  );
});

describe("listeningQuestionDensityOf (LP2)", () => {
  test("제시문 24자는 기기 밀도 그대로다", () => {
    expect(listeningQuestionDensityOf("regular", questionOf("가".repeat(24)))).toBe("regular");
    expect(listeningQuestionDensityOf("compact", questionOf("가".repeat(24)))).toBe("compact");
  });

  test("제시문 25자부터는 compact다", () => {
    expect(listeningQuestionDensityOf("regular", questionOf("가".repeat(25)))).toBe("compact");
    expect(listeningQuestionDensityOf("regular", questionOf("가".repeat(38)))).toBe("compact");
  });
});
