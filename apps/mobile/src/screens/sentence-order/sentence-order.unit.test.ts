import { describe, expect, it } from "vitest";

import {
  bankChipIndexes,
  canCheckArrangement,
  chipAccessibilityLabel,
  isSentenceOrderSessionComplete,
  judgeSentenceOrder,
  sentenceOrderAnnouncement,
  sentenceOrderCompletionAnnouncement,
  sentenceOrderCompletionText,
  sentenceOrderFinishLabel,
  sentenceOrderProgressLabel,
  sentenceOrderResultAt,
  sentenceOrderScreenTitle,
  sentenceOrderSessionReducer,
  sentenceOrderSessionResults,
  type SentenceOrderQuestion,
  type SentenceOrderSessionState,
} from "./sentence-order";

// 기대값을 구현에서 베끼지 않습니다.
//
// DOM·컴포넌트를 import하지 않습니다 — sentence-order.ts의 순수 함수 열둘만
// 봅니다. toHaveClass·toHaveStyle 같은 매처가 없습니다(ADR-0006 D4).
//
// 문항 데이터는 이 계약이 값을 고정하지 않으므로 이 파일 안에서 픽스처를 직접
// 만듭니다 — sentenceOrderQuestionsByStep을 읽어 단언하지 않습니다.

// 조각 셋, 정답 순서 [0, 1, 2] — 가장 단순한 픽스처입니다.
const simpleQuestion: SentenceOrderQuestion = {
  prompt: "낱말을 순서대로 배열해 문장을 만드세요.",
  chips: ["저는", "학생", "입니다"],
  answerOrder: [0, 1, 2],
};

// 같은 낱말이 두 번 나오는 문항입니다 — 문자열 비교가 아니라 인덱스 비교임을 보이는
// 픽스처입니다.
const duplicateWordQuestion: SentenceOrderQuestion = {
  prompt: "나는 밥을 먹고 너는 빵을 먹는다.",
  chips: ["나는", "밥을", "먹고", "너는", "빵을", "먹는다"],
  answerOrder: [0, 1, 2, 3, 4, 5],
};

function stateWith(overrides: Partial<SentenceOrderSessionState>): SentenceOrderSessionState {
  return {
    questionIndex: 0,
    placedChipIndexes: [],
    phase: "arranging",
    submittedOrders: [],
    ...overrides,
  };
}

describe("judgeSentenceOrder", () => {
  it("정답 순서 그대로면 correct다", () => {
    expect(judgeSentenceOrder(simpleQuestion, [0, 1, 2])).toBe("correct");
  });

  it("두 조각의 자리를 바꾸면 incorrect다", () => {
    expect(judgeSentenceOrder(simpleQuestion, [1, 0, 2])).toBe("incorrect");
  });

  it("길이가 짧으면 incorrect다", () => {
    expect(judgeSentenceOrder(simpleQuestion, [0, 1])).toBe("incorrect");
  });

  it("빈 배열이어도 던지지 않고 incorrect다", () => {
    expect(() => judgeSentenceOrder(simpleQuestion, [])).not.toThrow();
    expect(judgeSentenceOrder(simpleQuestion, [])).toBe("incorrect");
  });

  it("같은 낱말이 두 번 나오는 문항에서도 인덱스로 갈린다", () => {
    expect(judgeSentenceOrder(duplicateWordQuestion, [0, 1, 2, 3, 4, 5])).toBe("correct");
    // 문자열로 보면 "나는"과 "너는"이 다르므로 자리를 바꿔도 표면 문장이 여전히
    // 달라 보이지만, 인덱스 비교이므로 정답 인덱스 순서를 벗어나면 곧바로
    // incorrect입니다.
    expect(judgeSentenceOrder(duplicateWordQuestion, [3, 1, 2, 0, 4, 5])).toBe("incorrect");
  });
});

describe("sentenceOrderSessionReducer — 전이표 일곱 줄", () => {
  it("1: arranging, chipIndex ∉ p → toggleChip → 끝에 붙는다", () => {
    const state = stateWith({ placedChipIndexes: [0] });
    const next = sentenceOrderSessionReducer(state, { type: "toggleChip", chipIndex: 1 });
    expect(next.placedChipIndexes).toEqual([0, 1]);
  });

  it("2: arranging, chipIndex ∈ p → toggleChip → 그 하나만 빠지고 뒤가 당겨진다", () => {
    const state = stateWith({ placedChipIndexes: [0, 1, 2] });
    const next = sentenceOrderSessionReducer(state, { type: "toggleChip", chipIndex: 1 });
    expect(next.placedChipIndexes).toEqual([0, 2]);
  });

  it("3: checked → toggleChip → 같은 참조", () => {
    const state = stateWith({ phase: "checked", placedChipIndexes: [0, 1] });
    const next = sentenceOrderSessionReducer(state, { type: "toggleChip", chipIndex: 0 });
    expect(next).toBe(state);
  });

  it("4: arranging → check → checked로, submittedOrders에 배치가 쌓인다", () => {
    const state = stateWith({ placedChipIndexes: [0, 1, 2] });
    const next = sentenceOrderSessionReducer(state, { type: "check" });
    expect(next.phase).toBe("checked");
    expect(next.submittedOrders).toEqual([[0, 1, 2]]);
  });

  it("5: checked → check → 같은 참조", () => {
    const state = stateWith({ phase: "checked" });
    const next = sentenceOrderSessionReducer(state, { type: "check" });
    expect(next).toBe(state);
  });

  it("6: checked → nextQuestion → questionIndex+1, p 비움, arranging, s 유지", () => {
    const state = stateWith({
      questionIndex: 0,
      phase: "checked",
      placedChipIndexes: [0, 1, 2],
      submittedOrders: [[0, 1, 2]],
    });
    const next = sentenceOrderSessionReducer(state, { type: "nextQuestion" });
    expect(next.questionIndex).toBe(1);
    expect(next.placedChipIndexes).toEqual([]);
    expect(next.phase).toBe("arranging");
    expect(next.submittedOrders).toEqual([[0, 1, 2]]);
  });

  it("7: arranging → nextQuestion → 같은 참조", () => {
    const state = stateWith({ phase: "arranging" });
    const next = sentenceOrderSessionReducer(state, { type: "nextQuestion" });
    expect(next).toBe(state);
  });
});

describe("sentenceOrderSessionReducer — 불변식 셋", () => {
  it("toggleChip을 조각 수만큼 서로 다르게 부르면 placedChipIndexes가 chips의 순열이다", () => {
    let state = stateWith({});
    for (let chipIndex = 0; chipIndex < simpleQuestion.chips.length; chipIndex += 1) {
      state = sentenceOrderSessionReducer(state, { type: "toggleChip", chipIndex });
    }
    const sorted = [...state.placedChipIndexes].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2]);
  });

  it("배치 뒤 같은 조각을 다시 누르면 길이가 1 줄고 나머지 순서가 보존된다", () => {
    const state = stateWith({ placedChipIndexes: [2, 0, 1] });
    const next = sentenceOrderSessionReducer(state, { type: "toggleChip", chipIndex: 0 });
    expect(next.placedChipIndexes).toEqual([2, 1]);
    expect(next.placedChipIndexes.length).toBe(state.placedChipIndexes.length - 1);
  });

  it("check 뒤 submittedOrders.length가 정확히 1 는다", () => {
    const state = stateWith({ placedChipIndexes: [0, 1, 2] });
    const next = sentenceOrderSessionReducer(state, { type: "check" });
    expect(next.submittedOrders.length).toBe(state.submittedOrders.length + 1);
  });
});

describe("canCheckArrangement", () => {
  it("덜 배치되면 false다", () => {
    const state = stateWith({ placedChipIndexes: [0] });
    expect(canCheckArrangement(simpleQuestion, state)).toBe(false);
  });

  it("전부 배치되면 true다", () => {
    const state = stateWith({ placedChipIndexes: [0, 1, 2] });
    expect(canCheckArrangement(simpleQuestion, state)).toBe(true);
  });

  it("phase가 checked면 전부 배치돼도 false다", () => {
    const state = stateWith({ phase: "checked", placedChipIndexes: [0, 1, 2] });
    expect(canCheckArrangement(simpleQuestion, state)).toBe(false);
  });
});

describe("bankChipIndexes", () => {
  it("배치된 것이 빠진다", () => {
    const state = stateWith({ placedChipIndexes: [1] });
    expect(bankChipIndexes(simpleQuestion, state)).toEqual([0, 2]);
  });

  it("남은 순서가 chips 순서다", () => {
    const state = stateWith({ placedChipIndexes: [2] });
    expect(bankChipIndexes(simpleQuestion, state)).toEqual([0, 1]);
  });

  it("전부 배치되면 빈 배열이다", () => {
    const state = stateWith({ placedChipIndexes: [0, 1, 2] });
    expect(bankChipIndexes(simpleQuestion, state)).toEqual([]);
  });
});

describe("chipAccessibilityLabel", () => {
  it("placedOrdinal이 null이면 이름만이다", () => {
    expect(chipAccessibilityLabel("저는", null)).toBe("저는");
  });

  it("placedOrdinal이 2면 `${text}, 2번째`다", () => {
    expect(chipAccessibilityLabel("저는", 2)).toBe("저는, 2번째");
  });
});

describe("sentenceOrderResultAt", () => {
  it("arranging이면 null이다", () => {
    const state = stateWith({ phase: "arranging", placedChipIndexes: [0, 1, 2] });
    expect(sentenceOrderResultAt(simpleQuestion, state)).toBeNull();
  });

  it("checked면 판정이 난다", () => {
    const state = stateWith({ phase: "checked", placedChipIndexes: [0, 1, 2] });
    expect(sentenceOrderResultAt(simpleQuestion, state)).toBe("correct");
  });
});

describe("sentenceOrderSessionResults", () => {
  it("길이가 이력과 같고, i번째가 judgeSentenceOrder(q[i], s[i])다", () => {
    const questions = [simpleQuestion, duplicateWordQuestion];
    const submittedOrders = [
      [0, 1, 2],
      [3, 1, 2, 0, 4, 5],
    ];
    const results = sentenceOrderSessionResults(questions, submittedOrders);
    expect(results.length).toBe(submittedOrders.length);
    expect(results[0]).toBe(judgeSentenceOrder(questions[0]!, submittedOrders[0]!));
    expect(results[1]).toBe(judgeSentenceOrder(questions[1]!, submittedOrders[1]!));
  });

  it("이력이 짧으면 짧은 쪽으로 끝난다", () => {
    const questions = [simpleQuestion, duplicateWordQuestion];
    const submittedOrders = [[0, 1, 2]];
    const results = sentenceOrderSessionResults(questions, submittedOrders);
    expect(results.length).toBe(1);
  });

  it("빈 이력이면 빈 배열이다", () => {
    expect(sentenceOrderSessionResults([simpleQuestion], [])).toEqual([]);
  });
});

describe("sentenceOrderAnnouncement", () => {
  it("correct는 `채점 결과, 정답`이다", () => {
    expect(sentenceOrderAnnouncement("correct")).toBe("채점 결과, 정답");
  });

  it("incorrect는 `채점 결과, 오답`이다", () => {
    expect(sentenceOrderAnnouncement("incorrect")).toBe("채점 결과, 오답");
  });
});

describe("제목 · 진행 문구", () => {
  it("sentenceOrderScreenTitle(3)은 `3단계 · 문장 순서`다", () => {
    expect(sentenceOrderScreenTitle(3)).toBe("3단계 · 문장 순서");
  });

  it("진행 문구는 `문항 1 / 3`이다(0-based index)", () => {
    expect(sentenceOrderProgressLabel(0, 3)).toBe("문항 1 / 3");
  });
});

describe("isSentenceOrderSessionComplete", () => {
  it("questionIndex가 total 이상이면 true다", () => {
    expect(isSentenceOrderSessionComplete(stateWith({ questionIndex: 3 }), 3)).toBe(true);
  });

  it("questionIndex가 total 미만이면 false다", () => {
    expect(isSentenceOrderSessionComplete(stateWith({ questionIndex: 2 }), 3)).toBe(false);
  });
});

// ---------------------------------------------------------------- 완료 전이 발화
// 기대값의 정본은 계약입니다 — sentence-order.ts에서 베끼지 않습니다.
//
// ⚠ 이 화면만 능동 채널이 둘입니다 — 위의 `sentenceOrderAnnouncement`(채점)와 아래
// `sentenceOrderCompletionAnnouncement`(완료 전이)입니다. 이름이 두 채널을 가르고,
// 채점 쪽은 이 변경에서 이름도 몸통도 안 바뀝니다. 둘이 같은 순간에 겹치지 않는다는
// 것은 이 계층이 아니라 `ui`의 X-F가 집니다.

describe("완료 전이 발화의 상수 둘", () => {
  // 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 자리**에서 나옵니다 (ADR-0016 D11-1).
  it("완료 문구 상수가 화면에 이미 있는 `문항을 모두 마쳤어요`다", () => {
    expect(sentenceOrderCompletionText).toBe("문항을 모두 마쳤어요");
  });

  it("완료 상태의 유일한 조작 단위 라벨이 `결과 보기`다", () => {
    expect(sentenceOrderFinishLabel).toBe("결과 보기");
  });
});

describe("sentenceOrderCompletionAnnouncement", () => {
  // U1 — 오늘 호출자가 넘기는 값으로 부르면 정해진 문자열과 **문자 그대로**
  // 같습니다.
  it("U1 — sentenceOrderFinishLabel로 부르면 `문항을 모두 마쳤어요, 결과 보기`다", () => {
    expect(sentenceOrderCompletionAnnouncement(sentenceOrderFinishLabel)).toBe(
      "문항을 모두 마쳤어요, 결과 보기",
    );
  });

  // U2 — 인자가 형식을 실제로 통과합니다. 이 단언이 있어야 「인자 없는 상수 반환」의
  // 공허함을 피한 것이 지어집니다.
  it("U2 — 다른 인자 둘의 반환이 다르고, 완료 문구 뒤가 쉼표+공백 하나와 그 인자다", () => {
    const withFinish = sentenceOrderCompletionAnnouncement("결과 보기");
    const withExit = sentenceOrderCompletionAnnouncement("맵으로");

    expect(withFinish).not.toBe(withExit);
    expect(withFinish.slice(sentenceOrderCompletionText.length)).toBe(", 결과 보기");
    expect(withExit.slice(sentenceOrderCompletionText.length)).toBe(", 맵으로");
  });

  // U3 — 앞절이 그 화면의 완료 문구 상수를 지납니다. 리터럴을 다시 적지 않습니다 —
  // 적으면 정본이 둘이 되고, 상수를 인라인 리터럴로 흩어도 이 단언이 안 잡습니다.
  it("U3 — 앞절이 sentenceOrderCompletionText와 같은 표를 지난다", () => {
    expect(
      sentenceOrderCompletionAnnouncement(sentenceOrderFinishLabel).startsWith(
        sentenceOrderCompletionText,
      ),
    ).toBe(true);
  });

  // U4 — 부수효과가 없습니다. `announce`를 부르지 않는 순수 함수라 호스트가 없어도
  // 던지지 않습니다.
  it("U4 — 같은 인자로 두 번 불러도 같은 값이고 던지지 않는다", () => {
    expect(() => sentenceOrderCompletionAnnouncement(sentenceOrderFinishLabel)).not.toThrow();
    expect(sentenceOrderCompletionAnnouncement(sentenceOrderFinishLabel)).toBe(
      sentenceOrderCompletionAnnouncement(sentenceOrderFinishLabel),
    );
  });

  // 채점 채널이 안 바뀌었다는 것을 같은 파일이 집니다 — 두 채널이 이름으로 갈리고
  // 서로의 문자열을 침범하지 않습니다.
  it("채점 채널과 문자열이 겹치지 않는다 — 이름이 두 채널을 가른다", () => {
    expect(sentenceOrderCompletionAnnouncement(sentenceOrderFinishLabel)).not.toBe(
      sentenceOrderAnnouncement("correct"),
    );
    expect(sentenceOrderAnnouncement("correct")).toBe("채점 결과, 정답");
  });
});
