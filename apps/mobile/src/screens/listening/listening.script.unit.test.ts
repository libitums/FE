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
    [false, false, "none"],
    [true, false, "full"],
    [false, true, "full"],
    [true, true, "full"],
  ] as const)("RS1. showTranscript %s · revealed %s → %s", (showTranscript, revealed, expected) => {
    expect(listeningScriptOf({ showTranscript, revealed })).toBe(expected);
  });

  // 답 전 로마자만 보이던 갈래는 없다(보기 로마자 결정 1) — 옛 입력이 와도 결과에 romanization이 없다.
  test.each([
    [false, false, "none"],
    [true, false, "full"],
    [false, true, "full"],
    [true, true, "full"],
  ] as const)(
    "RS1. 옛 beforeAnswer 입력은 무시된다 — showTranscript %s · revealed %s → %s",
    (showTranscript, revealed, expected) => {
      const legacy = { showTranscript, revealed, beforeAnswer: "romanization" };

      expect(listeningScriptOf(legacy as never)).toBe(expected);
      expect(listeningScriptOf(legacy as never)).not.toBe("romanization");
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
