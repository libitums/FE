import { describe, expect, test } from "vitest";

import { keystrokesFor } from "../messenger/hangul-keyboard";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { wordChoiceCompletionAnnouncement } from "../word-choice/word-choice";
import type { TypingQuestion, TypingSessionAction, TypingSessionState } from "./typing.contract";
import {
  canCheckTyping,
  initialTypingSessionState,
  isTypingSessionComplete,
  judgeTyping,
  typedTextOf,
  typingCompletionAnnouncement,
  typingResultAt,
  typingSessionReducer,
  typingSessionResults,
} from "./typing";

// `unit` 계층: 타자 입력 세션의 상태 전이와 판정의 입출력만 봅니다.

const question = (id: string, answers: TypingQuestion["answers"]): TypingQuestion => ({
  id,
  kind: "dictation",
  instruction: "Type what you hear.",
  cue: "yeogwon yeogi isseoyo.",
  cueSupport: "Here's my passport.",
  hint: null,
  answers,
  audioSource: null,
});

const passport = question("S6-01", ["여권 여기 있어요.", "여권 여기 있어요"]);

function run(
  actions: readonly TypingSessionAction[],
  from: TypingSessionState = initialTypingSessionState,
): TypingSessionState {
  return actions.reduce(typingSessionReducer, from);
}

/** 글자를 치는 키 열을 자판 액션으로 풉니다 — 윗글쇠는 `shift` 액션, 띄어쓰기는 공백 키입니다. */
function typing(text: string): readonly TypingSessionAction[] {
  return keystrokesFor(text).map((stroke): TypingSessionAction => {
    if (stroke === "shift") return { type: "shift" };
    return { type: "press", key: stroke === "space" ? " " : stroke };
  });
}

describe("입력", () => {
  test("TY1. 키 열을 누르면 조합된 글자가 된다", () => {
    const state = run(typing("여권"));

    expect(typedTextOf(state)).toBe("여권");
    expect(state.phase).toBe("typing");
  });

  test("TY1. 윗글쇠 뒤 키는 윗글쇠 글자가 되고 윗글쇠가 풀린다", () => {
    const shifted = run([{ type: "shift" }]);
    expect(shifted.shifted).toBe(true);

    const pressed = run([{ type: "press", key: "ㅂ" }], shifted);
    expect(pressed.keys).toEqual(["ㅃ"]);
    expect(pressed.shifted).toBe(false);
  });

  test("TY2. 지우기는 마지막 키 하나만 뺀다", () => {
    const state = run([...typing("여권"), { type: "backspace" }]);

    expect(state.keys).toEqual(keystrokesFor("여권").slice(0, -1));
    expect(typedTextOf(state)).toBe("여궈");
  });

  test("TY2. 공백만 입력한 확인과 빈 입력의 확인은 상태를 바꾸지 않는다", () => {
    const blank = run([{ type: "press", key: " " }]);

    expect(canCheckTyping(blank)).toBe(false);
    expect(typingSessionReducer(blank, { type: "check" })).toBe(blank);
    expect(typingSessionReducer(initialTypingSessionState, { type: "check" })).toBe(
      initialTypingSessionState,
    );
  });

  test("TY2. 글자가 있으면 확인할 수 있다", () => {
    expect(canCheckTyping(run(typing("여권")))).toBe(true);
  });
});

describe("확인과 다음 문항", () => {
  test("TY3. 확인하면 checked가 되고 입력이 제출 목록에 남는다", () => {
    const checked = run([...typing("여권"), { type: "check" }]);

    expect(checked.phase).toBe("checked");
    expect(checked.submitted).toEqual(["여권"]);
  });

  test("TY3. 확인 뒤 자판 액션은 무시된다", () => {
    const checked = run([...typing("여권"), { type: "check" }]);

    expect(typingSessionReducer(checked, { type: "press", key: "ㅏ" })).toBe(checked);
    expect(typingSessionReducer(checked, { type: "backspace" })).toBe(checked);
    expect(typingSessionReducer(checked, { type: "shift" })).toBe(checked);
    expect(typingSessionReducer(checked, { type: "check" })).toBe(checked);
  });

  test("TY3. 다음 문항으로 가면 키와 윗글쇠가 비고 제출 목록은 남는다", () => {
    const checked = run([...typing("여권"), { type: "check" }]);

    const next = typingSessionReducer(checked, { type: "nextQuestion" });

    expect(next.questionIndex).toBe(1);
    expect(next.keys).toEqual([]);
    expect(next.shifted).toBe(false);
    expect(next.phase).toBe("typing");
    expect(next.submitted).toEqual(["여권"]);
  });

  test("TY3. 입력 중에는 다음 문항으로 가지 않는다", () => {
    const typed = run(typing("여권"));

    expect(typingSessionReducer(typed, { type: "nextQuestion" })).toBe(typed);
  });
});

describe("판정", () => {
  test.each([
    ["여권 여기 있어요", "correct"],
    ["여권여기있어요", "correct"],
    ["여권 여기 있어요?", "correct"],
    ["여권 여기", "incorrect"],
    ["", "incorrect"],
  ] as const)("TY4. %j → %s", (typed, expected) => {
    expect(judgeTyping(passport, typed)).toBe(expected);
  });

  test("TY4. 정답 목록 중 둘째와 같은 말도 맞다", () => {
    const two = question("q", ["저는 학생이에요.", "전 학생이에요."]);

    expect(judgeTyping(two, "전 학생이에요")).toBe("correct");
  });

  test("TY5. 확인 전에는 판정이 null이고 확인 뒤에는 그 문항의 판정이다", () => {
    const typed = run(typing("여권 여기 있어요"));
    expect(typingResultAt(passport, typed)).toBeNull();

    const checked = typingSessionReducer(typed, { type: "check" });
    expect(typingResultAt(passport, checked)).toBe("correct");

    const wrong = run([...typing("여권"), { type: "check" }]);
    expect(typingResultAt(passport, wrong)).toBe("incorrect");
  });

  test("TY5. 제출 이력이 문항보다 짧으면 짧은 쪽 길이로 판정을 낸다", () => {
    const questions = [passport, passport, passport];

    expect(typingSessionResults(questions, ["여권 여기 있어요"])).toEqual(["correct"]);
    expect(typingSessionResults(questions, ["여권 여기 있어요", "아니", "여권여기있어요"])).toEqual(
      ["correct", "incorrect", "correct"],
    );
    expect(typingSessionResults([passport], ["a", "b"])).toHaveLength(1);
  });

  test("TY5. 문항 수만큼 지나면 세션이 끝난 것이다", () => {
    expect(isTypingSessionComplete({ ...initialTypingSessionState, questionIndex: 2 }, 3)).toBe(
      false,
    );
    expect(isTypingSessionComplete({ ...initialTypingSessionState, questionIndex: 3 }, 3)).toBe(
      true,
    );
  });
});

describe("완료 낭독", () => {
  test("TY6. 단어 선택 · 듣기와 같은 규칙의 비지 않은 문자열이다", () => {
    const announcement = typingCompletionAnnouncement("See results", uiCopyEn);

    expect(announcement).not.toBe("");
    expect(announcement).toContain("See results");
    expect(announcement).toBe(wordChoiceCompletionAnnouncement("See results", uiCopyEn));
  });
});
