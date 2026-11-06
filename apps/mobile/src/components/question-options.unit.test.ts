import { describe, expect, test } from "vitest";

import {
  type QuestionOptionsInput,
  questionOptionId,
  questionOptionIndexOf,
  questionOptionsOf,
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

describe("questionOptionsOf (QO7)", () => {
  const choices = ["안녕하세요.", "네.", "저는 민아예요."];

  test("QO7. shown: 로마자가 있는 자리만 romanization 키가 서고 null · 빈 자리는 키가 없다", () => {
    const options = questionOptionsOf(
      { choices, romanizations: ["annyeonghaseyo.", null, ""] },
      "shown",
    );

    expect(options[0]).toEqual({ text: "안녕하세요.", romanization: "annyeonghaseyo." });
    expect(options[1]).toEqual({ text: "네." });
    expect(options[2]).toEqual({ text: "저는 민아예요." });
    expect(Object.keys(options[1] ?? {})).not.toContain("romanization");
    expect(Object.keys(options[2] ?? {})).not.toContain("romanization");
  });

  test("QO7. shown: 뜻은 로마자와 함께 유지된다", () => {
    const options = questionOptionsOf(
      { choices, romanizations: ["a", "b", "c"], meanings: ["Hello.", "Yes.", "I am Mina."] },
      "shown",
    );

    expect(options).toEqual([
      { text: "안녕하세요.", romanization: "a", meaning: "Hello." },
      { text: "네.", romanization: "b", meaning: "Yes." },
      { text: "저는 민아예요.", romanization: "c", meaning: "I am Mina." },
    ]);
  });

  test("QO7. hidden: romanization 키가 하나도 없고 로마자를 안 준 옛 출력과 toEqual이다", () => {
    const withRomans = questionOptionsOf(
      { choices, romanizations: ["a", "b", "c"], meanings: ["x", "y", "z"] },
      "hidden",
    );
    const legacy = questionOptionsOf({ choices, meanings: ["x", "y", "z"] }, "shown");

    expect(withRomans).toEqual(legacy);
    expect(withRomans.every((option) => !("romanization" in option))).toBe(true);
    expect(withRomans.map((option) => option.meaning)).toEqual(["x", "y", "z"]);
  });

  test("QO7. romanizations가 없으면 shown이어도 키가 없다", () => {
    const options = questionOptionsOf({ choices }, "shown");

    expect(options).toEqual(choices.map((text) => ({ text })));
  });

  test("QO7. meanings는 길이가 같을 때만 싣는다", () => {
    const options = questionOptionsOf({ choices, meanings: ["only one"] }, "shown");

    expect(options.every((option) => option.meaning === undefined)).toBe(true);
  });
});

describe("questionOptionSelectorPropsOf — 로마자 (QO8)", () => {
  const romanOptions = [
    { text: "카페", romanization: "kape", meaning: "Cafe" },
    { text: "학교", meaning: "School" },
    { text: "병원", romanization: "byeongwon", meaning: "Hospital" },
  ];
  const labels = ["카페, kape, Cafe", "학교, School", "병원, byeongwon, Hospital"];
  const romanOf = (option: object | undefined): unknown =>
    Reflect.get(option ?? {}, "romanization");

  test("QO8. romanization을 OptionSelectorOption.romanization으로 넘기고 없는 자리는 키가 없다", () => {
    const props = questionOptionSelectorPropsOf(
      input({ options: romanOptions, accessibilityLabels: labels }),
    );

    expect(props.options.map(romanOf)).toEqual(["kape", undefined, "byeongwon"]);
    expect(Object.keys(props.options[1] ?? {})).not.toContain("romanization");
  });

  test("QO8. 판정 뒤 접힘이면 고른 보기 하나와 그 로마자만 남는다", () => {
    const props = questionOptionSelectorPropsOf(
      input({
        options: romanOptions,
        accessibilityLabels: labels,
        state: { kind: "judged", index: 2, result: "correct", rest: "collapsed" },
      }),
    );

    expect(props.options).toHaveLength(1);
    expect(romanOf(props.options[0])).toBe("byeongwon");
    expect(props.options[0]).toMatchObject({ id: "choice-2", feedback: "correct" });
  });

  test("QO8. 판정 뒤 비활성이어도 모든 보기의 로마자가 남는다", () => {
    const props = questionOptionSelectorPropsOf(
      input({
        options: romanOptions,
        accessibilityLabels: labels,
        state: { kind: "judged", index: 0, result: "incorrect", rest: "disabled" },
      }),
    );

    expect(props.options.map(romanOf)).toEqual(["kape", undefined, "byeongwon"]);
  });
});
