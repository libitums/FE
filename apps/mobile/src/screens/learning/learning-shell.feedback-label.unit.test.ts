import { describe, expect, test } from "vitest";

import { learningShellFeedbackLabel } from "./learning-shell.contract";

// `unit` 계층: 해설 판의 낭독 이름을 만드는 순수 함수의 입출력만 봅니다.

describe("learningShellFeedbackLabel (SH-U1)", () => {
  test("제목, 줄1, 줄2 순서로 쉼표로 잇는다", () => {
    expect(
      learningShellFeedbackLabel({
        tone: "correct",
        title: "Nice reply!",
        lines: [
          { text: "Answer a compliment with thanks.", lang: "en" },
          { text: "칭찬을 들으면 감사합니다로 받아요.", lang: "ko" },
        ],
      }),
    ).toBe("Nice reply!, Answer a compliment with thanks., 칭찬을 들으면 감사합니다로 받아요.");
  });

  test("빈 줄은 건너뛰고 줄이 없으면 제목만이다", () => {
    expect(
      learningShellFeedbackLabel({
        tone: "incorrect",
        title: "Not quite",
        lines: [
          { text: "", lang: "en" },
          { text: "   ", lang: "ko" },
          { text: "Try again next time.", lang: "en" },
        ],
      }),
    ).toBe("Not quite, Try again next time.");
    expect(learningShellFeedbackLabel({ tone: "incorrect", title: "Not quite", lines: [] })).toBe(
      "Not quite",
    );
  });
});
