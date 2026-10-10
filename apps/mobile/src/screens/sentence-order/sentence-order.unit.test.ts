import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  canCheckArrangement,
  canPlaceChip,
  composedSentence,
  chipAccessibilityLabel,
  isSentenceOrderSessionComplete,
  judgeSentenceOrder,
  sentenceOrderAnnouncement,
  sentenceOrderChipClassName,
  sentenceOrderCompletionAnnouncement,
  sentenceOrderResultAt,
  sentenceOrderSessionReducer,
  sentenceOrderSessionResults,
  type SentenceOrderQuestion,
  type SentenceOrderSessionState,
} from "./sentence-order";
import { uiCopyEn } from "../../lib/ui-copy-en";

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

  it("오답 낱말이 섞이면 정답 길이만큼 놓았을 때 true다 — 창고를 다 비울 필요가 없다", () => {
    const question = { prompt: "p", chips: ["a", "b", "x", "c"], answerOrder: [0, 1, 3] };
    expect(canCheckArrangement(question, stateWith({ placedChipIndexes: [0, 1, 3] }))).toBe(true);
    expect(canCheckArrangement(question, stateWith({ placedChipIndexes: [0, 1] }))).toBe(false);
  });

  it("phase가 checked면 전부 배치돼도 false다", () => {
    const state = stateWith({ phase: "checked", placedChipIndexes: [0, 1, 2] });
    expect(canCheckArrangement(simpleQuestion, state)).toBe(false);
  });
});

describe("chipAccessibilityLabel", () => {
  it("placedOrdinal이 null이면 이름만이다", () => {
    expect(chipAccessibilityLabel("저는", null, uiCopyEn)).toBe("저는");
  });

  it("placedOrdinal이 2면 `${text}, 2번째`다", () => {
    expect(chipAccessibilityLabel("저는", 2, uiCopyEn)).toBe("저는, position 2");
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
    expect(sentenceOrderAnnouncement("correct", uiCopyEn)).toBe("Result, correct");
  });

  it("incorrect는 `채점 결과, 오답`이다", () => {
    expect(sentenceOrderAnnouncement("incorrect", uiCopyEn)).toBe("Result, incorrect");
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

describe("sentenceOrderCompletionAnnouncement", () => {
  // U1 — 나아가는 라벨로 부르면 정해진 문자열과 **문자 그대로** 같습니다 (RL7).
  it("U1 — `See results`로 부르면 `All questions done, See results`다", () => {
    expect(sentenceOrderCompletionAnnouncement("See results", uiCopyEn)).toBe(
      "All questions done, See results",
    );
  });

  // U2 — 인자가 형식을 실제로 통과합니다.
  it("U2 — 다른 인자 둘의 반환이 다르고, 앞절 뒤가 쉼표+공백 하나와 그 인자다", () => {
    const withFinish = sentenceOrderCompletionAnnouncement("See results", uiCopyEn);
    const withExit = sentenceOrderCompletionAnnouncement("Back to map", uiCopyEn);

    expect(withFinish).not.toBe(withExit);
    expect(withFinish).toBe("All questions done, See results");
    expect(withExit).toBe("All questions done, Back to map");
  });

  // U4 — 부수효과가 없습니다.
  it("U4 — 같은 인자로 두 번 불러도 같은 값이고 던지지 않는다", () => {
    expect(() => sentenceOrderCompletionAnnouncement("See results", uiCopyEn)).not.toThrow();
    expect(sentenceOrderCompletionAnnouncement("See results", uiCopyEn)).toBe(
      sentenceOrderCompletionAnnouncement("See results", uiCopyEn),
    );
  });

  // 채점 채널이 안 바뀌었다는 것을 같은 파일이 집니다 — 두 채널이 이름으로 갈리고
  // 서로의 문자열을 침범하지 않습니다.
  it("채점 채널과 문자열이 겹치지 않는다 — 이름이 두 채널을 가른다", () => {
    expect(sentenceOrderCompletionAnnouncement("See results", uiCopyEn)).not.toBe(
      sentenceOrderAnnouncement("correct", uiCopyEn),
    );
    expect(sentenceOrderAnnouncement("correct", uiCopyEn)).toBe("Result, correct");
  });
});

describe("canPlaceChip · composedSentence", () => {
  const question = { prompt: "p", chips: ["a", "b", "x"], answerOrder: [0, 1] };

  it("칸이 다 차면 더 놓을 수 없다", () => {
    expect(canPlaceChip(question, stateWith({ placedChipIndexes: [0] }))).toBe(true);
    expect(canPlaceChip(question, stateWith({ placedChipIndexes: [0, 2] }))).toBe(false);
  });

  it("채점 뒤에는 놓을 수 없다", () => {
    expect(canPlaceChip(question, stateWith({ phase: "checked", placedChipIndexes: [0] }))).toBe(
      false,
    );
  });

  it("놓인 조각을 순서대로 공백으로 잇는다", () => {
    expect(composedSentence(question, [1, 0])).toBe("b a");
  });
});

describe("sentenceOrderChipClassName", () => {
  it("U-S4. reduced이면 bank · placed 모두 클래스 끝에 motion-reduced가 붙는다", () => {
    expect(sentenceOrderChipClassName("bank", "reduced")).toBe(
      "sentence-order-chip sentence-order-chip-bank sentence-order-chip-motion-reduced",
    );
    expect(sentenceOrderChipClassName("placed", "reduced")).toBe(
      "sentence-order-chip sentence-order-chip-placed sentence-order-chip-motion-reduced",
    );
  });

  it("U-S5. standard이면 motion 문자열이 없다", () => {
    expect(sentenceOrderChipClassName("bank", "standard")).toBe(
      "sentence-order-chip sentence-order-chip-bank",
    );
    expect(sentenceOrderChipClassName("placed", "standard")).toBe(
      "sentence-order-chip sentence-order-chip-placed",
    );
    expect(sentenceOrderChipClassName("bank", "standard")).not.toContain("motion");
    expect(sentenceOrderChipClassName("placed", "standard")).not.toContain("motion");
  });
});

// CSS 텍스트는 파일을 읽어 정규식으로 봅니다. unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
describe("sentence-order-chip.css", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/screens/sentence-order/sentence-order-chip.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /** 선택자 정규식에 맞는 첫 규칙의 본문. 규칙이 없으면 빈 문자열이라 이어지는 단언이 값 불일치로 실패합니다. */
  const ruleBody = (selector: RegExp): string =>
    new RegExp(`(?:^|\\})\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

  it("U-S1. bank 칩 눌림은 pressed 토큰 scale이고 기존 색 변화를 유지한다", () => {
    const body = ruleBody(/\.sentence-order-chip-bank:active/);
    expect(body).toMatch(/transform:\s*scale\(var\(--libitum-motion-scale-pressed\)\)/);
    expect(body).toMatch(/background-color:\s*var\(--libitum-color-gray-100\)/);
  });

  it("U-S2. bank base에 transform 전환이 있고 reduced 눌림은 transform: none이다", () => {
    expect(ruleBody(/\.sentence-order-chip-bank/)).toMatch(
      /transition:\s*transform var\(--libitum-motion-duration-pressed\) var\(--libitum-motion-easing-easing\)/,
    );
    expect(
      ruleBody(/\.sentence-order-chip-motion-reduced\.sentence-order-chip-bank:active/),
    ).toMatch(/transform:\s*none/);
  });

  it("U-S3. 비항등 scale 리터럴이 없고 placed · placeholder는 transform이 없다", () => {
    const nonIdentity = (css.match(/scale\(\s*[\d.]+\s*\)/g) ?? []).filter(
      (literal) => Number(/([\d.]+)/.exec(literal)?.[1] ?? Number.NaN) !== 1,
    );
    expect(nonIdentity).toEqual([]);
    expect(ruleBody(/\.sentence-order-chip-placed/)).not.toMatch(/transform/);
    expect(ruleBody(/\.sentence-order-chip-placeholder/)).not.toMatch(/transform/);
  });
});
