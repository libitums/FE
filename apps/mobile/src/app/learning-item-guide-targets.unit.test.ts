import { describe, expect, test } from "vitest";

import { learningItemGuideKindFor } from "../lib/learning-item-guide";
import { messengerConversationFor } from "../screens/messenger/messenger";
import { sentenceOrderQuestionsByStep } from "../screens/sentence-order/sentence-order-questions";
import { speakingQuestionsForStep } from "../screens/speaking/speaking";
import { writingQuestionsForStep } from "../screens/writing/writing";

// `unit` 계층: 제품 문항 표의 첫 문항이 사용자가 고른 묶음(튜토리얼의 누르기만 하는 문항)과
// 맞는가. 화면이 하는 것과 같은 옮기기(필드를 그대로 넘긴다)로 판정 함수에 넣는다.

const firstSentenceOrderKind = (step: keyof typeof sentenceOrderQuestionsByStep) => {
  const first = sentenceOrderQuestionsByStep[step][0];
  return learningItemGuideKindFor(
    first === undefined ? null : { form: "sentence-order", chips: first.chips },
  );
};

describe("제품 문항 표와 안내 대상", () => {
  test("TG1: 문장 만들기 greeting · introduction은 sentence-order", () => {
    expect(firstSentenceOrderKind("greeting")).toBe("sentence-order");
    expect(firstSentenceOrderKind("introduction")).toBe("sentence-order");
  });

  test("TG2: 문장 만들기 ordering · appointment · directions는 대상이 아니다", () => {
    expect(firstSentenceOrderKind("ordering")).toBeNull();
    expect(firstSentenceOrderKind("appointment")).toBeNull();
    expect(firstSentenceOrderKind("directions")).toBeNull();
  });

  test("TG3: 메신저 appointment-confirmation의 첫 답장은 messenger", () => {
    const first = messengerConversationFor("appointment-confirmation").messages[1];
    expect(learningItemGuideKindFor({ form: "messenger", choices: first.choices })).toBe(
      "messenger",
    );
  });

  test("TG4: 말하기 tutorial-speaking은 speaking, 쓰기 tutorial-writing은 writing", () => {
    const speaking = speakingQuestionsForStep("tutorial-speaking")[0];
    const writing = writingQuestionsForStep("tutorial-writing")[0];
    expect(
      learningItemGuideKindFor({ form: "speaking", optionalPractice: speaking?.optionalPractice }),
    ).toBe("speaking");
    expect(
      learningItemGuideKindFor({ form: "writing", optionalPractice: writing?.optionalPractice }),
    ).toBe("writing");
  });

  test("TG5: 말하기 introduction · 쓰기 directions의 첫 문항은 대상이 아니다", () => {
    const speaking = speakingQuestionsForStep("introduction")[0];
    const writing = writingQuestionsForStep("directions")[0];
    expect(speaking).toBeDefined();
    expect(writing).toBeDefined();
    expect(
      learningItemGuideKindFor({ form: "speaking", optionalPractice: speaking?.optionalPractice }),
    ).toBeNull();
    expect(
      learningItemGuideKindFor({ form: "writing", optionalPractice: writing?.optionalPractice }),
    ).toBeNull();
  });
});
