import { describe, expect, test } from "vitest";

import {
  canCheckTiles,
  catalogPassCriterion,
  composeTileReply,
  isTypedAnswerAccepted,
  isTypedAnswerCorrect,
  judgeAssessment,
  judgeChoice,
  judgeRoleplayReply,
  judgeSpeaking,
  judgeTileReply,
  matchedWordCount,
  normalizeAnswerText,
  speakingChunks,
  speakingWords,
  type ReplyTile,
} from "./index";

// `unit` 계층: 앱에서 옮겨 온 판정 규칙의 입출력. 앱의 판정 테스트도 재수출을 거쳐 같은 코드를 잽니다.

describe("judgeSpeaking", () => {
  test("JG1. 부호 · 공백을 무시하고 낱말이 다 맞으면 correct", () => {
    expect(judgeSpeaking("안녕하세요! 네, 처음이에요!", "안녕하세요 네 처음이에요")).toBe(
      "correct",
    );
    expect(judgeSpeaking("안녕하세요! 네, 처음이에요!", "  안녕하세요!  네, 처음이에요… ")).toBe(
      "correct",
    );
  });

  test("JG1. 한 낱말이 빠지면 incorrect", () => {
    expect(judgeSpeaking("안녕하세요! 네, 처음이에요!", "안녕하세요 처음이에요")).toBe("incorrect");
    expect(judgeSpeaking("안녕하세요! 네, 처음이에요!", "안녕하세요 네")).toBe("incorrect");
  });

  test("JG1. 빈 들음은 incorrect", () => {
    expect(judgeSpeaking("안녕하세요! 네, 처음이에요!", "")).toBe("incorrect");
  });

  test("JG1. speakingWords는 부호를 떼고 낱말로 가른다", () => {
    expect(speakingWords("안녕하세요! 네, 처음이에요!")).toEqual([
      "안녕하세요",
      "네",
      "처음이에요",
    ]);
    expect(speakingWords("  ")).toEqual([]);
  });
});

describe("matchedWordCount · speakingChunks", () => {
  test("JG2. 앞에서부터 연달아 맞은 낱말 수 — 중간에 틀리면 그 뒤는 세지 않는다", () => {
    expect(matchedWordCount("안녕하세요! 네, 처음이에요!", "안녕하세요 네 처음이에요")).toBe(3);
    expect(matchedWordCount("안녕하세요! 네, 처음이에요!", "안녕하세요 아니요 처음이에요")).toBe(1);
    expect(matchedWordCount("안녕하세요! 네, 처음이에요!", "네 처음이에요")).toBe(0);
  });

  test("JG2. 조각은 공백으로 가른 원문이고 맞힌 수까지만 matched", () => {
    expect(speakingChunks("안녕하세요! 네, 처음이에요!", 1)).toEqual([
      { text: "안녕하세요!", matched: true },
      { text: "네,", matched: false },
      { text: "처음이에요!", matched: false },
    ]);
    expect(speakingChunks("안녕하세요! 네, 처음이에요!", 3).every((chunk) => chunk.matched)).toBe(
      true,
    );
    expect(speakingChunks("안녕하세요! 네, 처음이에요!", 0).some((chunk) => chunk.matched)).toBe(
      false,
    );
  });
});

describe("judgeRoleplayReply", () => {
  test("JG3. 받아 주는 답과 부호만 다르면 correct", () => {
    expect(judgeRoleplayReply(["지금부터요!"], "지금부터요", [])).toBe("correct");
    expect(judgeRoleplayReply(["지금부터요!"], "감사합니다", [])).toBe("incorrect");
  });

  test("JG3. 받아 주는 답 중 하나만 맞아도 correct", () => {
    expect(judgeRoleplayReply(["진짜요? 감사합니다!", "감사합니다!"], "감사합니다", [])).toBe(
      "correct",
    );
  });

  test("JG3. 와일드카드 낱말은 비교에서 빼고 나머지가 차례대로 있으면 correct", () => {
    expect(judgeRoleplayReply(["저는 {name}이에요."], "저는 마이클이에요", ["{name}"])).toBe(
      "correct",
    );
    expect(judgeRoleplayReply(["저는 {name}이에요."], "마이클이에요", ["{name}"])).toBe(
      "incorrect",
    );
  });

  test("JG3. 정답이 이름뿐이면 무언가 말해야 correct", () => {
    expect(judgeRoleplayReply(["{name}"], "마이클", ["{name}"])).toBe("correct");
    expect(judgeRoleplayReply(["{name}"], "", ["{name}"])).toBe("incorrect");
  });
});

describe("normalizeAnswerText · isTypedAnswer*", () => {
  test('JG4. normalizeAnswerText("네, 처음!") = "네처음"', () => {
    expect(normalizeAnswerText("네, 처음!")).toBe("네처음");
  });

  test("JG4. NFD로 들어와도 NFC로 맞춘다", () => {
    expect(isTypedAnswerCorrect("감사합니다".normalize("NFD"), "감사합니다!")).toBe(true);
  });

  test("JG4. 기호 · 공백을 지우고 받아 주는 답 중 하나와 같으면 true", () => {
    expect(isTypedAnswerAccepted("진짜요 감사합니다", ["진짜요? 감사합니다!"])).toBe(true);
    expect(isTypedAnswerAccepted("감사합니다", ["진짜요? 감사합니다!", "감사합니다!"])).toBe(true);
    expect(isTypedAnswerAccepted("진짜요", ["진짜요? 감사합니다!"])).toBe(false);
  });

  test("JG4. 빈 입력 · 기호만 든 입력은 false", () => {
    expect(isTypedAnswerAccepted("", ["!"])).toBe(false);
    expect(isTypedAnswerAccepted("?!", ["!?"])).toBe(false);
    expect(isTypedAnswerCorrect("", "")).toBe(false);
  });
});

describe("타일 판정", () => {
  // u00 RP-01이 섞인 뒤 보이는 순서
  const tiles: readonly ReplyTile[] = [{ ko: "네," }, { ko: "처음이에요!" }, { ko: "안녕하세요!" }];
  const accepted = ["안녕하세요! 네, 처음이에요!"];

  test("JG5. composeTileReply는 놓은 순서대로 ko를 공백으로 잇는다", () => {
    expect(composeTileReply(tiles, [2, 0, 1])).toBe("안녕하세요! 네, 처음이에요!");
    expect(composeTileReply(tiles, [1])).toBe("처음이에요!");
    expect(composeTileReply(tiles, [])).toBe("");
  });

  test("JG5. 바른 순서는 correct, 보이는 순서 그대로는 incorrect", () => {
    expect(judgeTileReply(tiles, [2, 0, 1], accepted)).toBe("correct");
    expect(judgeTileReply(tiles, [0, 1, 2], accepted)).toBe("incorrect");
  });

  test("JG5. canCheckTiles는 다 놓았을 때만 true", () => {
    expect(canCheckTiles(tiles, [2, 0, 1])).toBe(true);
    expect(canCheckTiles(tiles, [2, 0])).toBe(false);
    expect(canCheckTiles(tiles, [])).toBe(false);
  });
});

describe("judgeChoice", () => {
  test("JG6. 고른 자리가 정답 자리면 correct — 0도 정답 자리다", () => {
    expect(judgeChoice(2, 2)).toBe("correct");
    expect(judgeChoice(0, 0)).toBe("correct");
    expect(judgeChoice(2, 1)).toBe("incorrect");
    expect(judgeChoice(0, 1)).toBe("incorrect");
  });
});

describe("catalogPassCriterion · judgeAssessment", () => {
  test("JG7. 문항 수 0 ~ 5의 최소 정답 수 = 0, 1, 2, 2, 3, 3", () => {
    expect([0, 1, 2, 3, 4, 5].map((count) => catalogPassCriterion(count).minCorrectCount)).toEqual([
      0, 1, 2, 2, 3, 3,
    ]);
  });

  test("JG7. 정답 수가 기준 이상이면 passed, 모자라면 failed", () => {
    expect(judgeAssessment(["correct", "incorrect", "correct"], { minCorrectCount: 2 })).toBe(
      "passed",
    );
    expect(judgeAssessment(["correct", "incorrect", "incorrect"], { minCorrectCount: 2 })).toBe(
      "failed",
    );
    expect(judgeAssessment([], { minCorrectCount: 0 })).toBe("passed");
  });
});
