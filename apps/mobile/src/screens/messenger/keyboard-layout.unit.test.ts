import { describe, expect, test } from "vitest";

import { hangulKeyRows, shiftedKeys } from "./hangul-keyboard";
import { keyboardLayout, keyHint, keyLabel } from "./keyboard-layout";
import type { KeyboardCell } from "./keyboard-layout";

// `unit` 계층: 자판 칸 배치(ADR-0112). 한 줄 10칸 격자 · 쉼표 없음 · 자모는 hangulKeyRows 순서.

const cellOf = (id: string): KeyboardCell => {
  const found = keyboardLayout.flat().find((cell) => cell.id === id);
  if (found === undefined) throw new Error(`no cell ${id}`);
  return found;
};

const sumOf = (row: readonly KeyboardCell[]): number =>
  row.reduce((total, cell) => total + cell.flex, 0);

describe("keyboardLayout", () => {
  test("KT-U1. 줄 넷이고 줄마다 flex 합이 10이다", () => {
    expect(keyboardLayout).toHaveLength(4);
    for (const row of keyboardLayout) expect(sumOf(row)).toBeCloseTo(10, 6);
  });

  test("KT-U1. 줄1은 자모 10칸, 모두 flex 1 · 가운데 · 폭 비율 1", () => {
    const [first] = keyboardLayout;
    expect(first?.map((cell) => cell.id)).toEqual([...(hangulKeyRows[0] ?? [])]);
    for (const cell of first ?? []) {
      expect(cell).toMatchObject({ kind: "jamo", flex: 1, align: "center", keyWidthRatio: 1 });
    }
  });

  test("KT-U1. 줄2는 9칸, 양 끝 칸이 반 칸 여백을 차지한다", () => {
    const second = keyboardLayout[1] ?? [];
    expect(second.map((cell) => cell.id)).toEqual([...(hangulKeyRows[1] ?? [])]);
    expect(second[0]).toMatchObject({ flex: 1.5, align: "end" });
    expect(second[0]?.keyWidthRatio).toBeCloseTo(1 / 1.5, 6);
    expect(second[8]).toMatchObject({ flex: 1.5, align: "start" });
    expect(second[8]?.keyWidthRatio).toBeCloseTo(1 / 1.5, 6);
    for (const cell of second.slice(1, 8)) {
      expect(cell).toMatchObject({ flex: 1, align: "center", keyWidthRatio: 1 });
    }
  });

  test("KT-U1. 줄3은 윗글쇠(1.5) + 자모 7 + 지우기(1.5)", () => {
    const third = keyboardLayout[2] ?? [];
    expect(third.map((cell) => cell.id)).toEqual([
      "shift",
      ...(hangulKeyRows[2] ?? []),
      "backspace",
    ]);
    expect(third[0]).toMatchObject({ kind: "shift", flex: 1.5, keyWidthRatio: 1 });
    expect(third[8]).toMatchObject({ kind: "backspace", flex: 1.5, keyWidthRatio: 1 });
  });

  test("KT-U1. 줄4는 . (1.5) · 띄어쓰기(7) · ? (1.5)", () => {
    const fourth = keyboardLayout[3] ?? [];
    expect(fourth.map((cell) => [cell.id, cell.kind, cell.flex])).toEqual([
      [".", "symbol", 1.5],
      ["space", "space", 7],
      ["?", "symbol", 1.5],
    ]);
  });

  test("KT-U2. 칸 id는 유일하고 쉼표가 없다", () => {
    const ids = keyboardLayout.flat().map((cell) => cell.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(",");
    expect(ids).toHaveLength(31);
  });

  test("KT-U5. 미리보기는 자모 · 문장부호 칸만", () => {
    for (const cell of keyboardLayout.flat()) {
      expect(cell.preview).toBe(cell.kind === "jamo" || cell.kind === "symbol");
    }
  });
});

describe("keyLabel", () => {
  test("KT-U3. 자모는 윗글쇠에 따라 바뀌고, 바뀌지 않는 자모는 그대로다", () => {
    expect(keyLabel(cellOf("ㅂ"), false)).toBe("ㅂ");
    expect(keyLabel(cellOf("ㅂ"), true)).toBe("ㅃ");
    expect(keyLabel(cellOf("ㅔ"), true)).toBe("ㅖ");
    expect(keyLabel(cellOf("ㅁ"), true)).toBe("ㅁ");
  });

  test("KT-U3. 문장부호는 그 문자, 띄어쓰기는 space, 윗글쇠 · 지우기는 빈 문자열", () => {
    expect(keyLabel(cellOf("."), false)).toBe(".");
    expect(keyLabel(cellOf("?"), true)).toBe("?");
    expect(keyLabel(cellOf("space"), false)).toBe("space");
    expect(keyLabel(cellOf("shift"), false)).toBe("");
    expect(keyLabel(cellOf("backspace"), true)).toBe("");
  });
});

describe("keyHint", () => {
  test("KT-U4. 윗글쇠 글자가 있는 일곱 칸은 꺼져 있을 때 그 글자를 힌트로 준다", () => {
    for (const [base, shifted] of Object.entries(shiftedKeys)) {
      expect(keyHint(cellOf(base), false)).toBe(shifted);
    }
    expect(Object.keys(shiftedKeys)).toHaveLength(7);
  });

  test("KT-U4. 윗글쇠가 켜져 있으면 힌트가 없다", () => {
    expect(keyHint(cellOf("ㅂ"), true)).toBeNull();
  });

  test("KT-U4. 윗글쇠 글자가 없는 자모와 기능 키는 힌트가 없다", () => {
    expect(keyHint(cellOf("ㅁ"), false)).toBeNull();
    expect(keyHint(cellOf("shift"), false)).toBeNull();
    expect(keyHint(cellOf("space"), false)).toBeNull();
    expect(keyHint(cellOf("?"), false)).toBeNull();
  });
});
