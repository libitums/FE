import { describe, expect, it } from "vitest";

import type { AnswerResult } from "../../lib/answer-result";
import {
  assessmentAnnouncement,
  assessmentCompletesStep,
  assessmentItemAccessibilityLabel,
  assessmentItemTitle,
  assessmentPassCriterion,
  assessmentScreenTitle,
  assessmentVerdictLabel,
  judgeAssessment,
} from "./assessment";

// 기대값의 정본은 계약입니다 — 구현에서 베끼지 않습니다.
//
// DOM·컴포넌트를 import하지 않습니다 — assessment.ts의 순수 함수 일곱 + 상수
// 하나만 봅니다. 그래서 toHaveClass·toHaveStyle 같은 매처가 한 줄도 없습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).

// 정오 셋이 문항 하나의 판정을 집니다. 리터럴로 세웁니다 — 판정 함수의 red가 듣기
// 쪽 데이터 조회의 red와 섞이지 않도록 합니다(listening.unit.test.ts와 같은
// 판단입니다).
const allCorrect: readonly AnswerResult[] = ["correct", "correct", "correct"];
const allIncorrect: readonly AnswerResult[] = ["incorrect", "incorrect", "incorrect"];
// 2/3 정답 — u7의 임계값(2)과 정확히 경계에 서는 조합입니다.
const twoOfThreeCorrect: readonly AnswerResult[] = ["correct", "incorrect", "correct"];
const oneOfThreeCorrect: readonly AnswerResult[] = ["correct", "incorrect", "incorrect"];

describe("assessmentPassCriterion — (u7) 상수 단언", () => {
  // 내려온 결정이 조용히 바뀌면 완료 규칙이 통째로 바뀝니다 — 이 한 줄이 그것을
  // 지킵니다. 아래 judgeAssessment 경계 단언과는 역할이 다릅니다(저쪽은 함수의
  // 성질, 이쪽은 값의 고정입니다).
  it("minCorrectCount가 2다 — 문항 셋 중 과반수", () => {
    expect(assessmentPassCriterion.minCorrectCount).toBe(2);
  });
});

describe("judgeAssessment — 경계(minCorrectCount - 1 / minCorrectCount / +1)", () => {
  // 모듈 상수를 읽지 않습니다 — 임계값을 인자로 직접 바꿔 가며 봅니다. 값이 정해진
  // 뒤에도 그대로입니다.

  describe("전부 정답 (3/3)", () => {
    it("임계값이 정답 개수보다 하나 적으면(2) passed다", () => {
      expect(judgeAssessment(allCorrect, { minCorrectCount: 2 })).toBe("passed");
    });

    it("임계값이 정답 개수와 같으면(3) passed다", () => {
      expect(judgeAssessment(allCorrect, { minCorrectCount: 3 })).toBe("passed");
    });

    it("임계값이 정답 개수보다 하나 많으면(4) failed다", () => {
      expect(judgeAssessment(allCorrect, { minCorrectCount: 4 })).toBe("failed");
    });
  });

  describe("전부 오답 (0/3)", () => {
    it("임계값이 0이면(정답 개수와 같음) passed다", () => {
      expect(judgeAssessment(allIncorrect, { minCorrectCount: 0 })).toBe("passed");
    });

    it("임계값이 1이면(정답 개수보다 하나 많음) failed다", () => {
      expect(judgeAssessment(allIncorrect, { minCorrectCount: 1 })).toBe("failed");
    });
  });

  describe("섞임 — 2/3 정답 (u7 임계값 2가 실제로 갈리는 자리)", () => {
    it("임계값이 1(경계-1)이면 passed다", () => {
      expect(judgeAssessment(twoOfThreeCorrect, { minCorrectCount: 1 })).toBe("passed");
    });

    it("임계값이 2(경계와 같음)이면 passed다", () => {
      expect(judgeAssessment(twoOfThreeCorrect, { minCorrectCount: 2 })).toBe("passed");
    });

    it("임계값이 3(경계+1)이면 failed다", () => {
      expect(judgeAssessment(twoOfThreeCorrect, { minCorrectCount: 3 })).toBe("failed");
    });
  });

  describe("섞임 — 1/3 정답", () => {
    it("실제 상수(minCorrectCount: 2)로 판정하면 failed다", () => {
      expect(judgeAssessment(oneOfThreeCorrect, assessmentPassCriterion)).toBe("failed");
    });
  });

  it("빈 배열도 total이다 — 맞은 개수 0으로 판정되고 던지지 않는다", () => {
    expect(() => judgeAssessment([], { minCorrectCount: 0 })).not.toThrow();
    expect(judgeAssessment([], { minCorrectCount: 0 })).toBe("passed");
    expect(judgeAssessment([], { minCorrectCount: 1 })).toBe("failed");
  });

  // 실제 상수를 그대로 써서 u7의 결정(과반수 2/3)이 함수 결과로 이어지는지 봅니다.
  it("실제 상수(minCorrectCount: 2)를 쓰면 2/3 정답이 passed, 1/3 정답이 failed다", () => {
    expect(judgeAssessment(twoOfThreeCorrect, assessmentPassCriterion)).toBe("passed");
    expect(judgeAssessment(oneOfThreeCorrect, assessmentPassCriterion)).toBe("failed");
  });
});

describe("assessmentCompletesStep — (u7) 완료 표", () => {
  // "미통과는 완료를 걸지 않는다"의 1차 판정자입니다.
  it("passed는 완료를 건다", () => {
    expect(assessmentCompletesStep("passed")).toBe(true);
  });

  it("failed는 완료를 걸지 않는다", () => {
    expect(assessmentCompletesStep("failed")).toBe(false);
  });
});

describe("assessmentScreenTitle", () => {
  // `${ordinal}단계 · 평가` — 구분자는 가운뎃점 양옆 공백입니다.
  it("서수 3은 3단계 · 평가다", () => {
    expect(assessmentScreenTitle(3)).toBe("3단계 · 평가");
  });

  it("서수 1은 1단계 · 평가다", () => {
    expect(assessmentScreenTitle(1)).toBe("1단계 · 평가");
  });

  it("여정의 마지막 서수 5도 같은 형식이다", () => {
    expect(assessmentScreenTitle(5)).toBe("5단계 · 평가");
  });
});

describe("assessmentVerdictLabel — 판정 표", () => {
  // 낱말까지 고정합니다. "다시 도전"·"아쉬워요" 류를 쓰지 않습니다.
  it("passed는 통과다", () => {
    expect(assessmentVerdictLabel("passed")).toBe("통과");
  });

  it("failed는 미통과다", () => {
    expect(assessmentVerdictLabel("failed")).toBe("미통과");
  });

  it("두 낱말이 서로 다르다", () => {
    expect(assessmentVerdictLabel("passed")).not.toBe(assessmentVerdictLabel("failed"));
  });
});

describe("assessmentItemTitle", () => {
  // `문항 ${index + 1}` — index는 0-based입니다.
  it("0-based 인덱스 0은 문항 1이다", () => {
    expect(assessmentItemTitle(0)).toBe("문항 1");
  });

  it("0-based 인덱스 2는 문항 3이다", () => {
    expect(assessmentItemTitle(2)).toBe("문항 3");
  });
});

describe("assessmentItemAccessibilityLabel — 접미사 표", () => {
  // `${assessmentItemTitle(index)}, ${접미사}`. 0-based → 1-based입니다.
  it("correct는 문항 1, 정답이다", () => {
    expect(assessmentItemAccessibilityLabel(0, "correct")).toBe("문항 1, 정답");
  });

  it("incorrect는 문항 2, 오답이다", () => {
    expect(assessmentItemAccessibilityLabel(1, "incorrect")).toBe("문항 2, 오답");
  });

  // 「낱말이 듣기와 같다」 — 접미사 문구가 assessmentItemTitle 위에 그대로
  // 얹힙니다. 합성 규칙 자체를 봅니다(고정된 두 값 확인과는 다른 축입니다).
  it("어느 인덱스·판정에서도 제목 뒤에 쉼표+공백+접미사가 그대로 이어붙는다", () => {
    expect(assessmentItemAccessibilityLabel(4, "correct")).toBe(`${assessmentItemTitle(4)}, 정답`);
    expect(assessmentItemAccessibilityLabel(4, "incorrect")).toBe(
      `${assessmentItemTitle(4)}, 오답`,
    );
  });
});

describe("assessmentAnnouncement — 낭독 문자열", () => {
  it("passed는 평가 결과, 통과다", () => {
    expect(assessmentAnnouncement("passed")).toBe("평가 결과, 통과");
  });

  it("failed는 평가 결과, 미통과다", () => {
    expect(assessmentAnnouncement("failed")).toBe("평가 결과, 미통과");
  });

  // 「보이는 낱말과 낭독 낱말이 같다」 — assessmentVerdictLabel과
  // assessmentAnnouncement가 같은 내부 표를 지납니다. 갈리면 화면과 소리가 다른
  // 앱이 됩니다.
  it("낭독 문자열이 보이는 판정 낱말을 그대로 담는다", () => {
    expect(assessmentAnnouncement("passed")).toContain(assessmentVerdictLabel("passed"));
    expect(assessmentAnnouncement("failed")).toContain(assessmentVerdictLabel("failed"));
  });

  // 서수를 넣지 않습니다 — 단계는 화면 제목이 지는 정보입니다.
  it("서수를 담지 않는다 — 숫자가 없다", () => {
    expect(assessmentAnnouncement("passed")).not.toMatch(/\d/);
    expect(assessmentAnnouncement("failed")).not.toMatch(/\d/);
  });

  it("구분자가 쉼표 + 공백이다 (ADR-0016 D3)", () => {
    expect(assessmentAnnouncement("passed")).toContain(", ");
    expect(assessmentAnnouncement("failed")).toContain(", ");
  });
});
