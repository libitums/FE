import { describe, expect, it } from "vitest";

import type { JourneyStepId } from "../journey-map/journey-map";
import {
  choiceAccessibilityLabel,
  choiceResultAt,
  hasAnswered,
  initialListeningSessionState,
  isSessionComplete,
  judgeAnswer,
  listeningQuestionsByStep,
  listeningScreenTitle,
  listeningSessionReducer,
  playbackStateAfterPlay,
  questionProgressLabel,
  questionsForStep,
  sessionAnswerResults,
  type ListeningQuestion,
  type ListeningSessionState,
} from "./listening";

// 계약: .agent-harness/work/lib-223/spec.md §3.1(a) (`unit` 테스트 계획, pureFunctions 표)
// 기대값의 정본은 계약 §1.3~§1.5다 — 구현에서 베끼지 않는다.
//
// LIB-227 (.agent-harness/work/lib-227/spec.md §1.6(a)·(b) · §4.1 W2)이 이 파일의
// 모양을 갱신한다 — `ListeningSessionState`에 `answeredChoiceIndexes` 필드가 늘고,
// `nextQuestion` 전이 하나가 이력을 쌓으며, `sessionAnswerResults`가 새로 는다.
// 아래 전이·초기값 단언은 **새 모양**이다 — 지금은 필드 부재와 `not implemented`로
// 반드시 실패한다(계약 §1.6(a) 전이표 · §4.1 단언 목록).
//
// DOM·컴포넌트를 import하지 않는다 — 순수 함수 아홉 + 고정 데이터만 본다.
// 그래서 toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).

// 계약 §1.4 표가 고정한 다섯 스텝. Record가 다섯을 전부 갖는 것은 tsc가 지고,
// 이 배열은 테스트가 다섯을 하나도 빠뜨리지 않고 도는 축이다.
const stepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

// 계약 §1.4의 고정 데이터에서 그대로 온 문항 둘. questionsForStep을 거치지 않고
// 리터럴로 세운다 — 판정 함수의 red가 데이터 조회의 red와 섞이지 않게.
const questionAnswer0: ListeningQuestion = {
  prompt: "주문하시겠어요? 음료는 따뜻한 것과 차가운 것 중에 무엇으로 드릴까요?",
  audioSource: "ordering-2",
  choices: [
    "음료 온도를 묻고 있다",
    "계산 방법을 묻고 있다",
    "자리를 안내하고 있다",
    "영업 시간을 알리고 있다",
  ],
  answerIndex: 0,
};

const questionAnswer2: ListeningQuestion = {
  prompt: "따뜻한 아메리카노 한 잔 주세요.",
  audioSource: "ordering-1",
  choices: [
    "차가운 커피를 두 잔 주문하고 있다",
    "주문을 취소하고 있다",
    "따뜻한 커피를 한 잔 주문하고 있다",
    "물을 달라고 하고 있다",
  ],
  answerIndex: 2,
};

describe("questionsForStep", () => {
  // 계약 §3.1(a): ("ordering") → 길이 3 · 첫 문항의 prompt가 계약 §1.4의 값이다
  it("ordering 스텝은 문항 셋을 돌려주고 첫 문항이 계약이 고정한 것이다", () => {
    const questions = questionsForStep("ordering");

    expect(questions).toHaveLength(3);
    expect(questions[0]?.prompt).toBe("따뜻한 아메리카노 한 잔 주세요.");
  });

  // 계약 §1.4 「스텝 커버리지 = 다섯 전부」: 하나라도 비면 그 스텝에 들어간 순간 빈 화면이다
  it("다섯 스텝 전부 문항 셋을 돌려준다 — 비는 스텝이 없다", () => {
    const lengths = stepIds.map((id) => questionsForStep(id).length);

    expect(lengths).toEqual([3, 3, 3, 3, 3]);
  });

  it("greeting과 directions의 첫 문항이 계약 §1.4의 값이다", () => {
    expect(questionsForStep("greeting")[0]?.prompt).toBe("안녕하세요, 처음 뵙겠습니다.");
    expect(questionsForStep("directions")[0]?.prompt).toBe("혹시 지하철역이 어디예요?");
  });

  it("고정 데이터를 그대로 낸다 — 스텝마다 다른 목록이다", () => {
    expect(questionsForStep("ordering")).toEqual(listeningQuestionsByStep.ordering);
    expect(questionsForStep("greeting")).not.toEqual(listeningQuestionsByStep.ordering);
  });
});

describe("listeningScreenTitle", () => {
  // 계약 §1.5(b) 표: `${ordinal}단계 · 듣기`. 구분자는 가운뎃점 양옆 공백이다.
  it("서수 3은 3단계 · 듣기다", () => {
    expect(listeningScreenTitle(3)).toBe("3단계 · 듣기");
  });

  it("서수 1은 1단계 · 듣기다", () => {
    expect(listeningScreenTitle(1)).toBe("1단계 · 듣기");
  });

  it("여정의 마지막 서수 5도 같은 형식이다", () => {
    expect(listeningScreenTitle(5)).toBe("5단계 · 듣기");
  });
});

describe("questionProgressLabel", () => {
  // 계약 §1.5(b) 표: `문항 ${index + 1} / ${total}` — index는 0-based다
  it("첫 문항(0, 3)은 문항 1 / 3이다", () => {
    expect(questionProgressLabel(0, 3)).toBe("문항 1 / 3");
  });

  it("마지막 문항(2, 3)은 문항 3 / 3이다", () => {
    expect(questionProgressLabel(2, 3)).toBe("문항 3 / 3");
  });

  it("중간 문항(1, 3)은 문항 2 / 3이다", () => {
    expect(questionProgressLabel(1, 3)).toBe("문항 2 / 3");
  });
});

describe("judgeAnswer", () => {
  // 계약 §1.5(b): choiceIndex === question.answerIndex ? "correct" : "incorrect"
  it("정답 인덱스를 고르면 correct다", () => {
    expect(judgeAnswer(questionAnswer0, questionAnswer0.answerIndex)).toBe("correct");
    expect(judgeAnswer(questionAnswer2, questionAnswer2.answerIndex)).toBe("correct");
  });

  it("정답이 아닌 인덱스를 고르면 incorrect다", () => {
    expect(judgeAnswer(questionAnswer0, (questionAnswer0.answerIndex + 1) % 4)).toBe("incorrect");
    expect(judgeAnswer(questionAnswer2, (questionAnswer2.answerIndex + 1) % 4)).toBe("incorrect");
  });

  it("보기 넷 중 정확히 하나만 correct다", () => {
    const results = [0, 1, 2, 3].map((index) => judgeAnswer(questionAnswer2, index));

    expect(results).toEqual(["incorrect", "incorrect", "correct", "incorrect"]);
  });

  it("정답이 0번인 문항에서도 0을 correct로 낸다 — 0을 거짓으로 다루지 않는다", () => {
    expect(judgeAnswer(questionAnswer0, 0)).toBe("correct");
    expect(judgeAnswer(questionAnswer0, 3)).toBe("incorrect");
  });
});

describe("choiceResultAt", () => {
  // 계약 §3.1(a) 표 · §1.5(b): 선택된 보기면 judgeAnswer, 아니면 null
  it("응답 전에는 어느 보기도 판정을 지지 않는다 — 전부 null", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    const results = [0, 1, 2, 3].map((index) => choiceResultAt(state, questionAnswer2, index));

    expect(results).toEqual([null, null, null, null]);
  });

  it("고른 보기가 정답이면 correct다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBe("correct");
  });

  it("고른 보기가 오답이면 incorrect다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 1,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 1)).toBe("incorrect");
  });

  // 계약 §1.1 「정답을 알려 주지 않는다」: 오답일 때 어느 것이 정답이었는지 표시하지 않는다
  it("고르지 않은 보기는 정답이어도 판정을 지지 않는다 — null", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 1,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBeNull();
  });

  it("오답 응답 뒤에도 판정을 지는 보기는 고른 하나뿐이다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 1,
      answeredChoiceIndexes: [],
    };

    const results = [0, 1, 2, 3].map((index) => choiceResultAt(state, questionAnswer2, index));

    expect(results).toEqual([null, "incorrect", null, null]);
  });

  it("0번 보기를 골라도 판정을 진다 — 0을 미응답으로 다루지 않는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer0, 0)).toBe("correct");
    expect(choiceResultAt(state, questionAnswer2, 0)).toBe("incorrect");
  });
});

describe("choiceAccessibilityLabel", () => {
  // 계약 §1.5(b) 접미사 표. 구분자는 쉼표 + 공백이다 (ADR-0016 D3).
  it("판정이 없으면 접미사를 붙이지 않는다 — 텍스트 그대로", () => {
    expect(choiceAccessibilityLabel("음료 온도를 묻고 있다", null)).toBe("음료 온도를 묻고 있다");
  });

  it("correct는 정답 접미사를 붙인다", () => {
    expect(choiceAccessibilityLabel("음료 온도를 묻고 있다", "correct")).toBe(
      "음료 온도를 묻고 있다, 정답",
    );
  });

  it("incorrect는 오답 접미사를 붙인다", () => {
    expect(choiceAccessibilityLabel("계산 방법을 묻고 있다", "incorrect")).toBe(
      "계산 방법을 묻고 있다, 오답",
    );
  });

  // 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 된다 (계약 §1.5(b)).
  it("판정이 없을 때 구분자(쉼표 + 공백)가 아예 생기지 않는다", () => {
    expect(choiceAccessibilityLabel("자리를 안내하고 있다", null)).not.toContain(", ");
  });

  it("세 경우가 서로 다른 문자열이다", () => {
    const text = "영업 시간을 알리고 있다";

    const labels = new Set([
      choiceAccessibilityLabel(text, null),
      choiceAccessibilityLabel(text, "correct"),
      choiceAccessibilityLabel(text, "incorrect"),
    ]);

    expect(labels.size).toBe(3);
  });
});

describe("hasAnswered", () => {
  // 계약 §1.5(b): state.selectedChoiceIndex !== null — 응답 여부는 파생이다
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
    expect(hasAnswered(initialListeningSessionState)).toBe(false);
  });
});

describe("isSessionComplete", () => {
  // 계약 §1.3(c)·§1.5(b): 완료는 상태에 적히지 않고 questionIndex >= total로 파생된다
  it("마지막 문항에 응답만 한 상태는 아직 완료가 아니다", () => {
    expect(
      isSessionComplete(
        { questionIndex: 2, selectedChoiceIndex: 1, answeredChoiceIndexes: [0, 0] },
        3,
      ),
    ).toBe(false);
  });

  it("questionIndex가 문항 수와 같으면 완료다", () => {
    expect(
      isSessionComplete(
        { questionIndex: 3, selectedChoiceIndex: null, answeredChoiceIndexes: [0, 0, 0] },
        3,
      ),
    ).toBe(true);
  });

  it("첫 문항에 응답하지 않은 상태는 완료가 아니다", () => {
    expect(isSessionComplete(initialListeningSessionState, 3)).toBe(false);
  });

  it("questionIndex가 문항 수를 넘어도 완료다 — 판정은 >= 다", () => {
    expect(
      isSessionComplete(
        { questionIndex: 4, selectedChoiceIndex: null, answeredChoiceIndexes: [0, 0, 0, 0] },
        3,
      ),
    ).toBe(true);
  });
});

describe("listeningSessionReducer", () => {
  // 계약(lib-227) §1.6(a) 전이표 네 줄이 이 describe의 정본이다. c는 고른 보기,
  // a는 응답 이력이다. 바뀌는 줄은 넷째(nextQuestion — 응답했으면) 하나뿐이고,
  // 나머지 셋은 이력이 그대로 실려 나가거나(같은 참조) 이력이 늘지 않는다.

  it("selectChoice — 응답 전이면 고른 보기가 기록된다 — 이력은 아직 안 는다", () => {
    const next = listeningSessionReducer(initialListeningSessionState, {
      type: "selectChoice",
      choiceIndex: 2,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 2, answeredChoiceIndexes: [] });
  });

  it("selectChoice — 0번 보기도 기록된다", () => {
    const next = listeningSessionReducer(initialListeningSessionState, {
      type: "selectChoice",
      choiceIndex: 0,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 0, answeredChoiceIndexes: [] });
  });

  it("selectChoice — 현재 문항 인덱스와 이력은 바뀌지 않는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 2,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [1, 3],
    };

    const next = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 3 });

    expect(next).toEqual({
      questionIndex: 2,
      selectedChoiceIndex: 3,
      answeredChoiceIndexes: [1, 3],
    });
  });

  // 계약 §1.5(b): 응답은 문항당 한 번뿐. 막는 자리가 리듀서 하나다 — 컴포넌트가 아니다.
  it("selectChoice — 이미 응답했으면 다른 보기를 골라도 같은 참조를 돌려준다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });

    expect(next).toBe(state);
  });

  it("selectChoice — 이미 응답한 같은 보기를 다시 골라도 같은 참조를 돌려준다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 2 });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답 전에는 같은 참조를 돌려준다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답했으면 다음 문항으로 가고 선택이 비워지며 이력에 고른 보기가 쌓인다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 1,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2],
    });
  });

  // 계약 §1.6(a): 이력이 느는 자리가 nextQuestion 하나다 — 이미 이력이 있는 상태에서도
  // 새 응답이 **끝에 이어붙는다**(기존 이력을 덮어쓰지 않는다).
  it("nextQuestion — 이미 쌓인 이력 뒤에 이번 응답이 이어붙는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 1,
      selectedChoiceIndex: 3,
      answeredChoiceIndexes: [2],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 2,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2, 3],
    });
  });

  // 계약 §3.1(a) 마지막 줄 · lib-227 §1.6(a) 불변식: 마지막 문항을 넘기면 완료 상태가
  // 되고, 그 시점에 answeredChoiceIndexes.length === total이다.
  it("nextQuestion — 마지막 문항에서 넘기면 완료 상태가 되고 이력 길이가 문항 수와 같다", () => {
    const state: ListeningSessionState = {
      questionIndex: 2,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [2, 3],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 3,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2, 3, 0],
    });
    expect(isSessionComplete(next, 3)).toBe(true);
    expect(next.answeredChoiceIndexes).toHaveLength(3);
  });

  it("전이가 있으면 새 객체를 돌려준다 — 같은 참조가 아니다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    expect(listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 1 })).not.toBe(
      state,
    );
  });

  it("부수효과 없음 — 호출 뒤 입력 state 객체가 변형되지 않는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };
    const snapshot: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });
    listeningSessionReducer(state, { type: "nextQuestion" });

    expect(state).toEqual(snapshot);
  });

  it("세션 하나를 끝까지 돌리면 문항 셋을 지나 완료에 닿는다", () => {
    let state = initialListeningSessionState;

    for (let index = 0; index < 3; index += 1) {
      expect(state.questionIndex).toBe(index);
      state = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 0 });
      state = listeningSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state).toEqual({
      questionIndex: 3,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [0, 0, 0],
    });
    expect(isSessionComplete(state, 3)).toBe(true);
  });

  // 계약 §1.6(a) 불변식 · §4.1 「불변식: 문항 셋을 끝까지 돌면
  // answeredChoiceIndexes.length === 3이고 순서가 응답 순서다」. 위 케이스는 매번
  // 같은 보기(0)를 골라 순서가 드러나지 않으므로, 서로 다른 보기를 골라 순서까지 본다.
  it("불변식 — 서로 다른 보기를 고르며 끝까지 돌면 이력이 응답 순서 그대로 셋 쌓인다", () => {
    let state = initialListeningSessionState;
    const picks = [1, 3, 0];

    for (const choiceIndex of picks) {
      state = listeningSessionReducer(state, { type: "selectChoice", choiceIndex });
      state = listeningSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state.answeredChoiceIndexes).toEqual(picks);
    expect(state.answeredChoiceIndexes).toHaveLength(3);
    expect(isSessionComplete(state, 3)).toBe(true);
  });
});

describe("initialListeningSessionState (고정 데이터)", () => {
  it("첫 문항이고 아무것도 고르지 않았고 응답 이력이 비어 있다", () => {
    expect(initialListeningSessionState).toEqual({
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    });
  });
});

describe("sessionAnswerResults (계약 §1.6(b))", () => {
  // judgeAnswer를 다시 쓰지 않고 부른다 — 리터럴로 세운 문항 둘로 판정의 정본이
  // 하나임을 확인한다. questionAnswer0는 answerIndex 0, questionAnswer2는 answerIndex 2다.
  const questions: readonly ListeningQuestion[] = [questionAnswer0, questionAnswer2];

  it("이력과 같은 길이의 결과를 낸다 — i번째는 judgeAnswer(questions[i], a[i])와 같다", () => {
    const results = sessionAnswerResults(questions, [0, 2]);

    expect(results).toEqual(["correct", "correct"]);
  });

  it("오답을 섞어도 그 자리만 incorrect다", () => {
    const results = sessionAnswerResults(questions, [0, 1]);

    expect(results).toEqual(["correct", "incorrect"]);
  });

  it("이력이 문항 수보다 짧으면 짧은 쪽 길이로 끝난다 — 던지지 않는다", () => {
    expect(() => sessionAnswerResults(questions, [0])).not.toThrow();

    const results = sessionAnswerResults(questions, [0]);

    expect(results).toEqual(["correct"]);
  });

  it("빈 이력이면 빈 배열이다", () => {
    expect(sessionAnswerResults(questions, [])).toEqual([]);
  });

  it("문항이 없어도 던지지 않고 빈 배열이다", () => {
    expect(() => sessionAnswerResults([], [0, 1])).not.toThrow();
    expect(sessionAnswerResults([], [0, 1])).toEqual([]);
  });
});

describe("listeningQuestionsByStep (고정 데이터 불변식 — 계약 §1.4)", () => {
  it("다섯 스텝이 전부 있다", () => {
    expect(Object.keys(listeningQuestionsByStep).sort()).toEqual([...stepIds].sort());
  });

  it("스텝마다 문항이 셋이다", () => {
    const lengths = stepIds.map((id) => listeningQuestionsByStep[id].length);

    expect(lengths).toEqual([3, 3, 3, 3, 3]);
  });

  it("모든 문항의 보기가 넷이다", () => {
    for (const id of stepIds) {
      for (const question of listeningQuestionsByStep[id]) {
        expect(question.choices).toHaveLength(4);
      }
    }
  });

  it("모든 문항의 answerIndex가 0..3 안에 있다", () => {
    for (const id of stepIds) {
      for (const question of listeningQuestionsByStep[id]) {
        expect(question.answerIndex).toBeGreaterThanOrEqual(0);
        expect(question.answerIndex).toBeLessThanOrEqual(3);
      }
    }
  });

  it("모든 문항의 prompt와 보기 넷이 빈 문자열이 아니다", () => {
    for (const id of stepIds) {
      for (const question of listeningQuestionsByStep[id]) {
        expect(question.prompt.length).toBeGreaterThan(0);
        for (const choice of question.choices) {
          expect(choice.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("한 문항 안에서 보기 넷이 서로 다르다", () => {
    for (const id of stepIds) {
      for (const question of listeningQuestionsByStep[id]) {
        expect(new Set(question.choices).size).toBe(4);
      }
    }
  });

  // 계약 §1.4 「정답 인덱스」 행: 이것이 깨지면 "첫 보기만 계속 고르면 전부 맞는" 경로가
  // 생기고, 실기에서 오답 경로가 한 번도 안 나올 수 있다.
  it("한 스텝 안에서 세 문항의 정답 인덱스가 서로 다르다", () => {
    for (const id of stepIds) {
      const answerIndexes = listeningQuestionsByStep[id].map((question) => question.answerIndex);

      expect(new Set(answerIndexes).size).toBe(answerIndexes.length);
    }
  });

  it("어느 스텝에서도 한 인덱스만 계속 골라 셋을 다 맞힐 수 없다", () => {
    for (const id of stepIds) {
      const questions = listeningQuestionsByStep[id];

      for (const fixedChoice of [0, 1, 2, 3]) {
        const allCorrect = questions.every((question) => question.answerIndex === fixedChoice);

        expect(allCorrect).toBe(false);
      }
    }
  });

  // 계약 §1.4의 정답 인덱스 표를 그대로 옮긴다. 값의 정본은 계약이다.
  it("정답 인덱스가 계약 §1.4 표와 일치한다", () => {
    const table = stepIds.map((id) => ({
      id,
      answers: listeningQuestionsByStep[id].map((question) => question.answerIndex),
    }));

    expect(table).toEqual([
      { id: "greeting", answers: [0, 1, 2] },
      { id: "introduction", answers: [3, 0, 1] },
      { id: "ordering", answers: [2, 0, 3] },
      { id: "appointment", answers: [1, 2, 0] },
      { id: "directions", answers: [2, 0, 1] },
    ]);
  });

  // 계약 §1.4 「보기 문자열 안의 `,`」 행 · §3.1(a)의 마지막 케이스.
  // `choiceAccessibilityLabel`이 접미사를 `", "`로 잇는다 (§1.5(b) · ADR-0016 D3).
  // 보기 문자열 안에 쉼표가 있으면 `"네, 알겠습니다, 정답"`이 **세 마디로 갈려** 이름과
  // 상태의 경계가 사라진다.
  //
  // **지금 60개가 이미 깨끗해서 이 케이스는 처음부터 green이다.** 생략이 아니라
  // 회귀 방어선이다 — 강제하는 것이 없으면 문항이 늘 때 자동 계층이 전부 green인 채로
  // 통과시킨다. `unit`이 이 불변식의 유일한 강제 지점이다 (계약 §1.4).
  //
  // **`prompt`는 이 케이스의 대상이 아니다** (계약 §1.4 · §3.1(a)). 접미사를 잇는 것은
  // `choices`뿐이고, 고정 데이터의 prompt에 있는 쉼표는 **발화 문장의 것**이라 고치지
  // 않는다. prompt까지 검사하면 멀쩡한 고정 데이터가 실패로 잡힌다.
  it("모든 choices 문자열에 쉼표가 없다 — 낭독 접미사의 구분자와 충돌하지 않는다", () => {
    const choices = stepIds.flatMap((id) =>
      listeningQuestionsByStep[id].flatMap((question) => [...question.choices]),
    );

    // 앵커: 5 스텝 × 3 문항 × 보기 4 = 60개를 실제로 돌았다. 목록이 비면 아래 부재
    // 단언이 공허하게 통과한다.
    expect(choices).toHaveLength(60);
    expect(choices.filter((choice) => choice.includes(","))).toEqual([]);

    // 그 불변식이 무엇을 지키는지: 접미사가 붙어도 낭독 이름이 **정확히 두 마디**로
    // 갈린다. 위가 깨지는 순간 이 줄이 함께 빨개진다.
    expect(
      choices.filter(
        (choice) => choiceAccessibilityLabel(choice, "correct").split(", ").length !== 2,
      ),
    ).toEqual([]);
  });

  it("한 스텝 안에서 문항의 prompt가 서로 다르다", () => {
    for (const id of stepIds) {
      const prompts = listeningQuestionsByStep[id].map((question) => question.prompt);

      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });
});

// ---------------------------------------------------------------- 오디오 축 (계약 §9)

describe("playbackStateAfterPlay (계약 §9.5(c) 표)", () => {
  // 계약 §9.3: playAudio는 재생 **요청 한 번의 결과**를 돌려준다. 이 함수가 그 결과를
  // 화면이 보일 상태 어휘 둘로 옮긴다.
  it("started면 재생 중이다", () => {
    expect(playbackStateAfterPlay("started")).toBe("playing");
  });

  // **이 케이스가 이 축의 고장 모드를 막는 유일한 자동 방어선이다** (계약 §9.7
  // 「모듈이 없을 때 재생 중으로 보이지 않는다」). 모듈이 없으면 재생이 시작되지
  // 않았으므로 완료 신호도 오지 않는다 — "playing"으로 옮기면 화면이 영원히
  // `멈춤`에 갇히고, 고장이 정상인 척한다.
  it("unavailable이면 대기다 — 「재생 중」으로 보이지 않는다", () => {
    expect(playbackStateAfterPlay("unavailable")).toBe("idle");
  });

  it("두 결과가 서로 다른 상태로 갈린다", () => {
    expect(playbackStateAfterPlay("started")).not.toBe(playbackStateAfterPlay("unavailable"));
  });

  it("예약 상태어 넷과 겹치지 않는다 — CSS 상태 클래스가 되지 않는다", () => {
    const reserved = ["selected", "done", "current", "locked"];

    expect(reserved).not.toContain(playbackStateAfterPlay("started"));
    expect(reserved).not.toContain(playbackStateAfterPlay("unavailable"));
  });
});

describe("audioSource (고정 데이터 불변식 — 계약 §9.4)", () => {
  // 15개를 한 번에 도는 축. 목록이 비면 아래 부재 단언들이 공허하게 통과한다.
  const audioSources = stepIds.flatMap((id) =>
    listeningQuestionsByStep[id].map((question) => question.audioSource),
  );

  it("5 스텝 × 3 문항 = 15개를 실제로 돈다", () => {
    expect(audioSources).toHaveLength(15);
  });

  it("15개가 서로 다르다 — 문항마다 안정적 식별자 하나다", () => {
    expect(new Set(audioSources).size).toBe(15);
  });

  it("빈 문자열이 없다 — 필드가 옵셔널이 아니므로 빈 값이 그 자리를 대신할 수 있다", () => {
    expect(audioSources.filter((source) => source.length === 0)).toEqual([]);
  });

  // 계약 §9.4: `greeting-1.mp3`로 적으면 **번들에 그 파일이 있는 것으로 읽힌다.** 없다.
  // 지어낸 자산을 데이터에 적지 않는다 (ADR-0014 D4).
  it("확장자(.)가 없다 — 없는 자산을 있는 것으로 읽히게 하지 않는다", () => {
    expect(audioSources.filter((source) => source.includes("."))).toEqual([]);
  });

  // 계약 §9.4: 스킴(`https://…`)도 경로 구분자(`audio/greeting-1`)도 해석 방식을 미리
  // 정하는 것이고, 그것은 보류 표 「오디오 자산의 출처·형식」이 **밖**으로 표시한 자리다.
  // 자산이 오면 이 케이스를 **의식적으로** 연다.
  it("경로 구분자(/)와 스킴(:)이 없다 — 해석 방식을 조용히 정하지 않는다", () => {
    expect(audioSources.filter((source) => source.includes("/"))).toEqual([]);
    expect(audioSources.filter((source) => source.includes(":"))).toEqual([]);
  });

  it("공백이 없다", () => {
    expect(audioSources.filter((source) => /\s/.test(source))).toEqual([]);
  });

  it("네 금지 문자를 한 번에 봐도 걸리는 것이 없다", () => {
    expect(audioSources.filter((source) => /[./:\s]/.test(source))).toEqual([]);
  });

  // 계약 §9.4: 파생하지 않고 **데이터에 적는다.** `${stepId}-${index + 1}`로 계산하면
  // 명명 규칙이 코드에 박히고, 자산 공급자가 다른 이름을 주는 순간 규칙과 자산이 갈린다.
  // 이 표가 그 값의 정본이고, 아래 앵커가 "파생이 아니라 데이터"를 못박는다.
  it("15개 값이 계약 §9.4 표와 일치한다", () => {
    const table = stepIds.map((id) => ({
      id,
      sources: listeningQuestionsByStep[id].map((question) => question.audioSource),
    }));

    expect(table).toEqual([
      { id: "greeting", sources: ["greeting-1", "greeting-2", "greeting-3"] },
      { id: "introduction", sources: ["introduction-1", "introduction-2", "introduction-3"] },
      { id: "ordering", sources: ["ordering-1", "ordering-2", "ordering-3"] },
      { id: "appointment", sources: ["appointment-1", "appointment-2", "appointment-3"] },
      { id: "directions", sources: ["directions-1", "directions-2", "directions-3"] },
    ]);
  });

  // 계약 §9.9(b) 마지막 줄: **값이 데이터에 있고 파생이 아니라는 앵커.**
  // 화면이 읽는 경로(questionsForStep)로 한 번 더 확인한다.
  it("questionsForStep이 낸 문항이 그 값을 그대로 지고 나온다", () => {
    const ordering = questionsForStep("ordering");

    expect(ordering[0]?.audioSource).toBe("ordering-1");
    expect(ordering[1]?.audioSource).toBe("ordering-2");
    expect(ordering[2]?.audioSource).toBe("ordering-3");
  });

  it("다른 스텝의 첫 문항도 그 스텝의 첫 source를 진다", () => {
    expect(questionsForStep("greeting")[0]?.audioSource).toBe("greeting-1");
    expect(questionsForStep("directions")[2]?.audioSource).toBe("directions-3");
  });

  // 서수는 1-based다 (계약 §9.4) — `questionProgressLabel`이 사람에게 보이는 수와
  // 같은 축이라 문서·로그·자산 파일 이름이 어긋나지 않는다.
  it("서수가 1-based다 — 사람에게 보이는 문항 번호와 같은 축이다", () => {
    for (const id of stepIds) {
      listeningQuestionsByStep[id].forEach((question, index) => {
        expect(question.audioSource.endsWith(`-${index + 1}`)).toBe(true);
      });
    }
  });
});
