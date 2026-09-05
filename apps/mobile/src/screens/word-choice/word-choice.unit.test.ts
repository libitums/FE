import { describe, expect, it } from "vitest";

import type { JourneyStepId } from "../journey-map/journey-map";
import {
  choiceResultAt,
  hasAnswered,
  initialWordChoiceSessionState,
  isWordChoiceSessionComplete,
  judgeWordChoice,
  optionAccessibilityLabel,
  wordChoiceProgressLabel,
  wordChoiceQuestionsByStep,
  wordChoiceQuestionsForStep,
  wordChoiceScreenTitle,
  wordChoiceSessionReducer,
  wordChoiceSessionResults,
  type WordChoiceQuestion,
  type WordChoiceSessionState,
} from "./word-choice";

// 계약: .agent-harness/work/lib-229/spec.md §3.1 (unit — required, 작업 단위 W3)
// · §1.7(c) 순수 함수 열의 표 · §1.5(c) 타입.
// 기대값의 정본은 계약이다 — 구현에서 베끼지 않는다.
//
// DOM·컴포넌트를 import하지 않는다 — 순수 함수 열 + 문항 데이터 자리만 본다.
// toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).
//
// 계약 §1.5(d) · §8.2 보류 1·2: wordChoiceQuestionsByStep의 값은 이 계약이 지어내지
// 않는다 — 다섯 키 전부 빈 배열이다. 그래서 이 파일의 픽스처는 상수를 읽지 않고
// **파일 안에서 직접 만든다**. 「데이터 불변식」(answerOrder/answerIndex 범위 · 문항이
// 서로 다른가) 단언은 값이 없는 지금 세우지 않는다.

const stepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

// 픽스처 — answerIndex가 0인 문항. §3.1의 "answerIndex가 0인 문항에서 0번 보기가
// correct다" 단언을 세우는 데 쓴다(0을 거짓으로 다루는 자리를 만들지 않는다).
const questionAnswer0: WordChoiceQuestion = {
  prompt: "오늘 ___에 갑니다.",
  choices: ["학교", "가방", "우산", "시계"],
  answerIndex: 0,
};

const questionAnswer2: WordChoiceQuestion = {
  prompt: "저는 매일 ___를 마셔요.",
  choices: ["신발", "책상", "커피", "우산"],
  answerIndex: 2,
};

describe("wordChoiceScreenTitle", () => {
  // 계약 §3.1: wordChoiceScreenTitle(3) === "3단계 · 단어 선택"
  it("서수 3은 3단계 · 단어 선택이다", () => {
    expect(wordChoiceScreenTitle(3)).toBe("3단계 · 단어 선택");
  });

  it("서수 1은 1단계 · 단어 선택이다", () => {
    expect(wordChoiceScreenTitle(1)).toBe("1단계 · 단어 선택");
  });

  it("여정의 마지막 서수 5도 같은 형식이다", () => {
    expect(wordChoiceScreenTitle(5)).toBe("5단계 · 단어 선택");
  });
});

describe("wordChoiceProgressLabel", () => {
  // 계약 §3.1: 진행 문구 "문항 1 / 3"
  it("첫 문항(0, 3)은 문항 1 / 3이다", () => {
    expect(wordChoiceProgressLabel(0, 3)).toBe("문항 1 / 3");
  });

  it("마지막 문항(2, 3)은 문항 3 / 3이다", () => {
    expect(wordChoiceProgressLabel(2, 3)).toBe("문항 3 / 3");
  });

  it("중간 문항(1, 3)은 문항 2 / 3이다", () => {
    expect(wordChoiceProgressLabel(1, 3)).toBe("문항 2 / 3");
  });
});

describe("judgeWordChoice", () => {
  // 계약 §3.1: answerIndex가 0인 문항에서 0번 보기가 correct다
  it("정답 인덱스를 고르면 correct다 — answerIndex가 0인 문항도 포함한다", () => {
    expect(judgeWordChoice(questionAnswer0, 0)).toBe("correct");
    expect(judgeWordChoice(questionAnswer2, 2)).toBe("correct");
  });

  it("정답이 아닌 인덱스를 고르면 incorrect다", () => {
    expect(judgeWordChoice(questionAnswer0, 1)).toBe("incorrect");
    expect(judgeWordChoice(questionAnswer2, 0)).toBe("incorrect");
  });

  it("보기 넷 중 정확히 하나만 correct다", () => {
    const results = [0, 1, 2, 3].map((index) => judgeWordChoice(questionAnswer2, index));

    expect(results).toEqual(["incorrect", "incorrect", "correct", "incorrect"]);
  });
});

describe("choiceResultAt", () => {
  // 계약 §3.1: 고르지 않은 보기는 정답이어도 null · 0번 보기를 골라도 판정이 난다
  it("응답 전에는 어느 보기도 판정을 지지 않는다 — 전부 null", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    const results = [0, 1, 2, 3].map((index) => choiceResultAt(state, questionAnswer2, index));

    expect(results).toEqual([null, null, null, null]);
  });

  it("고른 보기가 정답이면 correct다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBe("correct");
  });

  it("고른 보기가 오답이면 incorrect다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 0)).toBe("incorrect");
  });

  it("고르지 않은 보기는 정답이어도 판정을 지지 않는다 — null", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBeNull();
  });

  it("0번 보기를 골라도 판정을 진다 — 0을 미응답으로 다루지 않는다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer0, 0)).toBe("correct");
    expect(choiceResultAt(state, questionAnswer2, 0)).toBe("incorrect");
  });
});

describe("optionAccessibilityLabel", () => {
  // 계약 §3.1: null → 이름만 · 판정 있으면 ", " 접미사
  it("판정이 없으면 접미사를 붙이지 않는다 — 텍스트 그대로", () => {
    expect(optionAccessibilityLabel("학교", null)).toBe("학교");
  });

  it("correct는 정답 접미사를 붙인다", () => {
    expect(optionAccessibilityLabel("학교", "correct")).toBe("학교, 정답");
  });

  it("incorrect는 오답 접미사를 붙인다", () => {
    expect(optionAccessibilityLabel("가방", "incorrect")).toBe("가방, 오답");
  });

  it("판정이 없을 때 구분자(쉼표 + 공백)가 아예 생기지 않는다", () => {
    expect(optionAccessibilityLabel("우산", null)).not.toContain(", ");
  });

  it("세 경우가 서로 다른 문자열이다", () => {
    const text = "시계";

    const labels = new Set([
      optionAccessibilityLabel(text, null),
      optionAccessibilityLabel(text, "correct"),
      optionAccessibilityLabel(text, "incorrect"),
    ]);

    expect(labels.size).toBe(3);
  });
});

describe("hasAnswered", () => {
  // 계약 §1.7(c) 표: selectedChoiceIndex !== null — 응답 여부는 파생이다
  it("고른 보기가 없으면 false다", () => {
    expect(
      hasAnswered({ questionIndex: 0, selectedChoiceIndex: null, answeredChoiceIndexes: [] }),
    ).toBe(false);
  });

  it("고른 보기가 있으면 true다", () => {
    expect(
      hasAnswered({ questionIndex: 0, selectedChoiceIndex: 2, answeredChoiceIndexes: [] }),
    ).toBe(true);
  });

  it("0번 보기를 골라도 true다 — 0을 미응답으로 다루지 않는다", () => {
    expect(
      hasAnswered({ questionIndex: 1, selectedChoiceIndex: 0, answeredChoiceIndexes: [] }),
    ).toBe(true);
  });

  it("초기 상태는 미응답이다", () => {
    expect(hasAnswered(initialWordChoiceSessionState)).toBe(false);
  });
});

describe("isWordChoiceSessionComplete", () => {
  // 계약 §1.7(c) 표: questionIndex >= total — 완료는 파생이다
  it("마지막 문항에 응답만 한 상태는 아직 완료가 아니다", () => {
    expect(
      isWordChoiceSessionComplete(
        { questionIndex: 2, selectedChoiceIndex: 1, answeredChoiceIndexes: [0, 0] },
        3,
      ),
    ).toBe(false);
  });

  it("questionIndex가 문항 수와 같으면 완료다", () => {
    expect(
      isWordChoiceSessionComplete(
        { questionIndex: 3, selectedChoiceIndex: null, answeredChoiceIndexes: [0, 0, 0] },
        3,
      ),
    ).toBe(true);
  });

  it("첫 문항에 응답하지 않은 상태는 완료가 아니다", () => {
    expect(isWordChoiceSessionComplete(initialWordChoiceSessionState, 3)).toBe(false);
  });

  it("questionIndex가 문항 수를 넘어도 완료다 — 판정은 >= 다", () => {
    expect(
      isWordChoiceSessionComplete(
        { questionIndex: 4, selectedChoiceIndex: null, answeredChoiceIndexes: [0, 0, 0, 0] },
        3,
      ),
    ).toBe(true);
  });
});

describe("wordChoiceSessionReducer", () => {
  // 계약 §3.1: 전이 네 줄 + 같은 참조 둘 — 듣기의 전이표와 같다(§1.7(c) 표).

  it("selectChoice — 응답 전이면 고른 보기가 기록된다 — 이력은 아직 안 는다", () => {
    const next = wordChoiceSessionReducer(initialWordChoiceSessionState, {
      type: "selectChoice",
      choiceIndex: 2,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 2, answeredChoiceIndexes: [] });
  });

  it("selectChoice — 0번 보기도 기록된다", () => {
    const next = wordChoiceSessionReducer(initialWordChoiceSessionState, {
      type: "selectChoice",
      choiceIndex: 0,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 0, answeredChoiceIndexes: [] });
  });

  // 막는 자리가 리듀서 하나다 — 컴포넌트가 아니다(§1.6(a)와 같은 규율).
  it("selectChoice — 이미 응답했으면 다른 보기를 골라도 같은 참조를 돌려준다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = wordChoiceSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답 전에는 같은 참조를 돌려준다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    const next = wordChoiceSessionReducer(state, { type: "nextQuestion" });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답했으면 다음 문항으로 가고 선택이 비워지며 이력에 고른 보기가 쌓인다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = wordChoiceSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 1,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2],
    });
  });

  it("nextQuestion — 이미 쌓인 이력 뒤에 이번 응답이 이어붙는다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 1,
      selectedChoiceIndex: 3,
      answeredChoiceIndexes: [2],
    };

    const next = wordChoiceSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 2,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2, 3],
    });
  });

  it("전이가 있으면 새 객체를 돌려준다 — 같은 참조가 아니다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    expect(wordChoiceSessionReducer(state, { type: "selectChoice", choiceIndex: 1 })).not.toBe(
      state,
    );
  });

  it("부수효과 없음 — 호출 뒤 입력 state 객체가 변형되지 않는다", () => {
    const state: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };
    const snapshot: WordChoiceSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    wordChoiceSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });
    wordChoiceSessionReducer(state, { type: "nextQuestion" });

    expect(state).toEqual(snapshot);
  });

  it("세션 하나를 끝까지 돌리면 문항 셋을 지나 완료에 닿는다", () => {
    let state = initialWordChoiceSessionState;

    for (let index = 0; index < 3; index += 1) {
      expect(state.questionIndex).toBe(index);
      state = wordChoiceSessionReducer(state, { type: "selectChoice", choiceIndex: 0 });
      state = wordChoiceSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state).toEqual({
      questionIndex: 3,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [0, 0, 0],
    });
    expect(isWordChoiceSessionComplete(state, 3)).toBe(true);
  });

  it("불변식 — 서로 다른 보기를 고르며 끝까지 돌면 이력이 응답 순서 그대로 셋 쌓인다", () => {
    let state = initialWordChoiceSessionState;
    const picks = [1, 3, 0];

    for (const choiceIndex of picks) {
      state = wordChoiceSessionReducer(state, { type: "selectChoice", choiceIndex });
      state = wordChoiceSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state.answeredChoiceIndexes).toEqual(picks);
    expect(isWordChoiceSessionComplete(state, 3)).toBe(true);
  });
});

describe("initialWordChoiceSessionState (고정 데이터)", () => {
  it("첫 문항이고 아무것도 고르지 않았고 응답 이력이 비어 있다", () => {
    expect(initialWordChoiceSessionState).toEqual({
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    });
  });
});

describe("wordChoiceSessionResults (계약 §1.7(c) 표)", () => {
  // judgeWordChoice를 다시 쓰지 않고 부른다 — 판정의 정본이 하나임을 확인한다.
  const questions: readonly WordChoiceQuestion[] = [questionAnswer0, questionAnswer2];

  it("이력과 같은 길이의 결과를 낸다 — i번째는 judgeWordChoice(questions[i], a[i])와 같다", () => {
    const results = wordChoiceSessionResults(questions, [0, 2]);

    expect(results).toEqual(["correct", "correct"]);
  });

  it("오답을 섞어도 그 자리만 incorrect다", () => {
    const results = wordChoiceSessionResults(questions, [0, 1]);

    expect(results).toEqual(["correct", "incorrect"]);
  });

  it("이력이 문항 수보다 짧으면 짧은 쪽 길이로 끝난다 — 던지지 않는다", () => {
    expect(() => wordChoiceSessionResults(questions, [0])).not.toThrow();

    const results = wordChoiceSessionResults(questions, [0]);

    expect(results).toEqual(["correct"]);
  });

  it("빈 이력이면 빈 배열이다", () => {
    expect(wordChoiceSessionResults(questions, [])).toEqual([]);
  });

  it("문항이 없어도 던지지 않고 빈 배열이다", () => {
    expect(() => wordChoiceSessionResults([], [0, 1])).not.toThrow();
    expect(wordChoiceSessionResults([], [0, 1])).toEqual([]);
  });
});

describe("wordChoiceQuestionsForStep", () => {
  // 계약 §1.7(c) 표: wordChoiceQuestionsByStep[id]의 조회. §1.5(d) · §8.2 보류 1·2에
  // 따라 값이 아직 없다 — 지금은 다섯 스텝 전부 빈 배열을 돌려주는 것이 정상 동작이다.
  it("다섯 스텝 전부 wordChoiceQuestionsByStep[id]를 그대로 낸다 — 지금은 빈 배열이다", () => {
    for (const id of stepIds) {
      expect(wordChoiceQuestionsForStep(id)).toEqual(wordChoiceQuestionsByStep[id]);
      expect(wordChoiceQuestionsForStep(id)).toEqual([]);
    }
  });

  it("던지지 않는다 — Record가 다섯 스텝 전부를 덮는다", () => {
    for (const id of stepIds) {
      expect(() => wordChoiceQuestionsForStep(id)).not.toThrow();
    }
  });
});

describe("wordChoiceQuestionsByStep (문항 데이터 자리 — 계약 §1.5(d) · §8.2 보류 1·2)", () => {
  it("다섯 스텝 전부가 있다", () => {
    expect(Object.keys(wordChoiceQuestionsByStep).sort()).toEqual([...stepIds].sort());
  });

  // 값을 지어내지 않았다는 것 자체가 이 단위의 계약이다 — 다섯 키 전부 빈 배열이다.
  it("값을 지어내지 않았다 — 다섯 키 전부 빈 배열이다", () => {
    for (const id of stepIds) {
      expect(wordChoiceQuestionsByStep[id]).toEqual([]);
    }
  });
});
