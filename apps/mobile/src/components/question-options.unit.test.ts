import { describe, expect, test } from "vitest";

import {
  type QuestionOptionsInput,
  questionOptionId,
  questionOptionIndexOf,
  questionOptionSelectorPropsOf,
} from "./question-options";

// `unit` 계층: 화면 상태가 OptionSelector props로 바뀌는 입출력만 봅니다.

function input(overrides: Partial<QuestionOptionsInput> = {}): QuestionOptionsInput {
  return {
    groupLabel: "알맞은 것을 고르세요",
    options: [
      { text: "카페", meaning: "Cafe" },
      { text: "학교", meaning: "School" },
      { text: "병원", meaning: "Hospital" },
      { text: "시장", meaning: "Market" },
    ],
    accessibilityLabels: ["카페, Cafe", "학교, School", "병원, Hospital", "시장, Market"],
    layout: "stack",
    density: "regular",
    state: { kind: "open" },
    ...overrides,
  };
}

describe("옵션 id (QO1)", () => {
  test("choice-<번호>로 짓고 되돌린다", () => {
    expect(questionOptionId(2)).toBe("choice-2");
    expect(questionOptionIndexOf("choice-2")).toBe(2);
    expect(questionOptionIndexOf(questionOptionId(0))).toBe(0);
  });

  test("모르는 id는 null이다", () => {
    expect(questionOptionIndexOf("other")).toBeNull();
    expect(questionOptionIndexOf("choice-x")).toBeNull();
    expect(questionOptionIndexOf("")).toBeNull();
  });
});

describe("questionOptionSelectorPropsOf", () => {
  test("QO2: open regular — 고정 모양과 옵션 이름 · 뜻을 그대로 싣는다", () => {
    const props = questionOptionSelectorPropsOf(input());

    expect(props).toMatchObject({
      groupLabel: "알맞은 것을 고르세요",
      variant: "outlined-subtle",
      size: "m",
      selection: "single",
      commit: "immediate",
      layout: "stack",
      contentLanguage: "learning",
      languageTag: "ko",
      selectedIds: [],
    });
    expect(props.committed ?? false).toBe(false);
    expect(props.options.map((option) => option.id)).toEqual([
      "choice-0",
      "choice-1",
      "choice-2",
      "choice-3",
    ]);
    expect(props.options.map((option) => option.label)).toEqual(["카페", "학교", "병원", "시장"]);
    expect(props.options.map((option) => option.accessibilityLabel)).toEqual([
      "카페, Cafe",
      "학교, School",
      "병원, Hospital",
      "시장, Market",
    ]);
    expect(props.options.map((option) => option.meaning)).toEqual([
      "Cafe",
      "School",
      "Hospital",
      "Market",
    ]);
    expect(props.options.every((option) => option.feedback === undefined)).toBe(true);
  });

  test("QO2: 뜻이 없는 보기는 meaning 키가 비어 있다", () => {
    const props = questionOptionSelectorPropsOf(
      input({
        options: [{ text: "카페" }, { text: "학교" }],
        accessibilityLabels: ["카페", "학교"],
      }),
    );

    expect(props.options.map((option) => option.meaning)).toEqual([undefined, undefined]);
  });

  test("QO3: compact는 크기 s이고 layout은 그대로다", () => {
    const stack = questionOptionSelectorPropsOf(input({ density: "compact" }));
    const grid = questionOptionSelectorPropsOf(input({ density: "compact", layout: "grid" }));

    expect(stack.size).toBe("s");
    expect(stack.layout).toBe("stack");
    expect(grid.layout).toBe("grid");
    expect(questionOptionSelectorPropsOf(input({ layout: "grid" })).size).toBe("m");
  });

  test("QO4: 판정 뒤 — committed, 고른 보기 선택, 고른 보기만 feedback", () => {
    const props = questionOptionSelectorPropsOf(
      input({ state: { kind: "judged", index: 1, result: "incorrect", rest: "disabled" } }),
    );

    expect(props.committed).toBe(true);
    expect(props.selectedIds).toEqual(["choice-1"]);
    expect(props.options).toHaveLength(4);
    expect(props.options.map((option) => option.feedback)).toEqual([
      undefined,
      "incorrect",
      undefined,
      undefined,
    ]);
  });

  test("QO4: 정답이면 feedback이 correct다", () => {
    const props = questionOptionSelectorPropsOf(
      input({ state: { kind: "judged", index: 0, result: "correct", rest: "disabled" } }),
    );

    expect(props.options[0]?.feedback).toBe("correct");
    expect(props.selectedIds).toEqual(["choice-0"]);
  });

  test("QO5: 접힘이면 고른 보기 하나만 남고 committed다", () => {
    const props = questionOptionSelectorPropsOf(
      input({ state: { kind: "judged", index: 2, result: "correct", rest: "collapsed" } }),
    );

    expect(props.committed).toBe(true);
    expect(props.options).toHaveLength(1);
    expect(props.options[0]).toMatchObject({
      id: "choice-2",
      label: "병원",
      feedback: "correct",
      accessibilityLabel: "병원, Hospital",
      meaning: "Hospital",
    });
    expect(props.selectedIds).toEqual(["choice-2"]);
  });

  test("QO6: waiting은 open과 같은 props다", () => {
    const open = questionOptionSelectorPropsOf(input());
    const waiting = questionOptionSelectorPropsOf(input({ state: { kind: "waiting" } }));

    expect(waiting).toEqual(open);
  });
});
