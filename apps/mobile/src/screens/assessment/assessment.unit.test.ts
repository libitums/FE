import { describe, expect, it } from "vitest";

import type { ListeningAnswerResult } from "../listening/listening";
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

// 계약: .agent-harness/work/lib-227/spec.md §4.1 (`unit` 테스트 계획, W1의 pureFunctions 표)
// 기대값의 정본은 계약 §1.3~§1.5 · §1.4(u7) · §3.1이다 — 구현에서 베끼지 않는다.
//
// DOM·컴포넌트를 import하지 않는다 — assessment.ts의 순수 함수 일곱 + 상수 하나만
// 본다. 그래서 toHaveClass·toHaveStyle 같은 매처가 한 줄도 없다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).

// 계약 §1.5 표: 정오 셋이 문항 하나의 판정을 진다. 리터럴로 세운다 — 판정 함수의
// red가 듣기 쪽 데이터 조회의 red와 섞이지 않게 (listening.unit.test.ts와 같은 판단).
const allCorrect: readonly ListeningAnswerResult[] = ["correct", "correct", "correct"];
const allIncorrect: readonly ListeningAnswerResult[] = ["incorrect", "incorrect", "incorrect"];
// 2/3 정답 — u7의 임계값(2)과 정확히 경계에 서는 조합이다.
const twoOfThreeCorrect: readonly ListeningAnswerResult[] = ["correct", "incorrect", "correct"];
const oneOfThreeCorrect: readonly ListeningAnswerResult[] = ["correct", "incorrect", "incorrect"];

describe("assessmentPassCriterion — (u7) 상수 단언", () => {
  // 계약 §1.4 · §4.1 「상수 단언 하나」: 내려온 결정이 조용히 바뀌면 완료 규칙이
  // 통째로 바뀐다 — 이 한 줄이 그것을 지킨다. 아래 judgeAssessment 경계 단언과는
  // 역할이 다르다(저쪽은 함수의 성질, 이쪽은 값의 고정).
  it("minCorrectCount가 2다 — 문항 셋 중 과반수", () => {
    expect(assessmentPassCriterion.minCorrectCount).toBe(2);
  });
});

describe("judgeAssessment — 경계(minCorrectCount - 1 / minCorrectCount / +1)", () => {
  // 계약 §4.1: 모듈 상수를 읽지 않는다 — 임계값을 인자로 직접 바꿔 가며 본다.
  // 값이 정해진 뒤에도 그대로다(§1.4).

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

  // 실제 상수를 그대로 써서 u7의 결정(과반수 2/3)이 함수 결과로 이어지는지 확인한다.
  it("실제 상수(minCorrectCount: 2)를 쓰면 2/3 정답이 passed, 1/3 정답이 failed다", () => {
    expect(judgeAssessment(twoOfThreeCorrect, assessmentPassCriterion)).toBe("passed");
    expect(judgeAssessment(oneOfThreeCorrect, assessmentPassCriterion)).toBe("failed");
  });
});

describe("assessmentCompletesStep — (u7) 완료 표", () => {
  // 계약 §1.5 완료 표 · §4.1: "미통과는 완료를 걸지 않는다"의 1차 판정자다.
  it("passed는 완료를 건다", () => {
    expect(assessmentCompletesStep("passed")).toBe(true);
  });

  it("failed는 완료를 걸지 않는다", () => {
    expect(assessmentCompletesStep("failed")).toBe(false);
  });
});

describe("assessmentScreenTitle", () => {
  // 계약 §1.5 표: `${ordinal}단계 · 평가` — 구분자는 가운뎃점 양옆 공백이다.
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
  // 계약 §1.5 판정 표: 낱말까지 고정한다. "다시 도전"·"아쉬워요" 류를 쓰지 않는다.
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
  // 계약 §1.5 표: `문항 ${index + 1}` — index는 0-based다.
  it("0-based 인덱스 0은 문항 1이다", () => {
    expect(assessmentItemTitle(0)).toBe("문항 1");
  });

  it("0-based 인덱스 2는 문항 3이다", () => {
    expect(assessmentItemTitle(2)).toBe("문항 3");
  });
});

describe("assessmentItemAccessibilityLabel — 접미사 표", () => {
  // 계약 §1.5 표 · §4.1: `${assessmentItemTitle(index)}, ${접미사}`. 0-based → 1-based.
  it("correct는 문항 1, 정답이다", () => {
    expect(assessmentItemAccessibilityLabel(0, "correct")).toBe("문항 1, 정답");
  });

  it("incorrect는 문항 2, 오답이다", () => {
    expect(assessmentItemAccessibilityLabel(1, "incorrect")).toBe("문항 2, 오답");
  });

  // 계약 §1.5 「낱말이 듣기와 같다」 — 접미사 문구가 assessmentItemTitle 위에 그대로
  // 얹힌다. 합성 규칙 자체를 본다(고정된 두 값 확인과는 다른 축).
  it("어느 인덱스·판정에서도 제목 뒤에 쉼표+공백+접미사가 그대로 이어붙는다", () => {
    expect(assessmentItemAccessibilityLabel(4, "correct")).toBe(`${assessmentItemTitle(4)}, 정답`);
    expect(assessmentItemAccessibilityLabel(4, "incorrect")).toBe(
      `${assessmentItemTitle(4)}, 오답`,
    );
  });
});

describe("assessmentAnnouncement — 낭독 문자열 (계약 §3.1)", () => {
  it("passed는 평가 결과, 통과다", () => {
    expect(assessmentAnnouncement("passed")).toBe("평가 결과, 통과");
  });

  it("failed는 평가 결과, 미통과다", () => {
    expect(assessmentAnnouncement("failed")).toBe("평가 결과, 미통과");
  });

  // 계약 §3.1 「보이는 낱말과 낭독 낱말이 같다」: assessmentVerdictLabel과
  // assessmentAnnouncement가 같은 내부 표를 지난다 — 갈리면 화면과 소리가 다른 앱이 된다.
  it("낭독 문자열이 보이는 판정 낱말을 그대로 담는다", () => {
    expect(assessmentAnnouncement("passed")).toContain(assessmentVerdictLabel("passed"));
    expect(assessmentAnnouncement("failed")).toContain(assessmentVerdictLabel("failed"));
  });

  // 계약 §3.1: 서수를 넣지 않는다 — 단계는 화면 제목이 지는 정보다.
  it("서수를 담지 않는다 — 숫자가 없다", () => {
    expect(assessmentAnnouncement("passed")).not.toMatch(/\d/);
    expect(assessmentAnnouncement("failed")).not.toMatch(/\d/);
  });

  it("구분자가 쉼표 + 공백이다 (ADR-0016 D3)", () => {
    expect(assessmentAnnouncement("passed")).toContain(", ");
    expect(assessmentAnnouncement("failed")).toContain(", ");
  });
});
