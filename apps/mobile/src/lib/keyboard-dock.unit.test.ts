import { describe, expect, test } from "vitest";

import {
  keyboardDockBodyStyle,
  keyboardDockEdgesOf,
  keyboardRowsInsetStyle,
  zeroKeyboardDockEdges,
} from "./keyboard-dock";
import type { KeyboardDockEdges } from "./keyboard-dock";
import { zeroSafeAreaInsets } from "./safe-area";
import type { SafeAreaInsets } from "./safe-area";

// `unit` 계층: 자판 화면이 받는 세 변과 두 인라인 여백의 입출력만 봅니다.

const ios: SafeAreaInsets = { top: 59, bottom: 34, left: 0, right: 0 };
const wide: SafeAreaInsets = { top: 24, bottom: 48, left: 44, right: 12 };

describe("keyboardDockEdgesOf", () => {
  test("KD1. 위를 버리고 아래 · 좌 · 우만 남긴다", () => {
    const edges = keyboardDockEdgesOf(ios);

    expect(edges).toEqual({ bottom: 34, left: 0, right: 0 });
    expect(Object.keys(edges)).toHaveLength(3);
    expect(keyboardDockEdgesOf(wide)).toEqual({ bottom: 48, left: 44, right: 12 });
  });
});

describe("zeroKeyboardDockEdges", () => {
  test("KD2. 세 변이 0이고 인셋 0에서 뽑은 값과 같다", () => {
    expect(zeroKeyboardDockEdges).toEqual({ bottom: 0, left: 0, right: 0 });
    expect(keyboardDockEdgesOf(zeroSafeAreaInsets)).toEqual(zeroKeyboardDockEdges);
  });
});

describe("keyboardDockBodyStyle", () => {
  test("KD3. 아래는 몸통 담당일 때만 · 좌우는 늘 인셋 그대로다", () => {
    const edges: KeyboardDockEdges = { bottom: 34, left: 0, right: 0 };

    expect(keyboardDockBodyStyle(edges, "body")).toEqual({
      marginBottom: "34px",
      marginLeft: "0px",
      marginRight: "0px",
    });
    expect(keyboardDockBodyStyle(edges, "keyboard").marginBottom).toBe("0px");

    const wideEdges: KeyboardDockEdges = { bottom: 48, left: 44, right: 12 };
    for (const owner of ["keyboard", "body"] as const) {
      const style = keyboardDockBodyStyle(wideEdges, owner);
      expect(style.marginLeft).toBe("44px");
      expect(style.marginRight).toBe("12px");
    }
    expect(keyboardDockBodyStyle({ bottom: 34.5, left: 0, right: 0 }, "body").marginBottom).toBe(
      "34.5px",
    );
  });
});

describe("keyboardRowsInsetStyle", () => {
  test("KD4. 세 변 각각 px 문자열이고 0이면 모두 0px이다", () => {
    expect(keyboardRowsInsetStyle({ bottom: 48, left: 44, right: 12 })).toEqual({
      marginBottom: "48px",
      marginLeft: "44px",
      marginRight: "12px",
    });
    expect(keyboardRowsInsetStyle(zeroKeyboardDockEdges)).toEqual({
      marginBottom: "0px",
      marginLeft: "0px",
      marginRight: "0px",
    });
  });
});

describe("비정상 값", () => {
  const bad = [Number.NaN, -1, Number.POSITIVE_INFINITY, -0];

  test.each(bad)("KD5. %s 는 그 변이 0이다", (value) => {
    const insets: SafeAreaInsets = { top: 0, bottom: value, left: value, right: value };
    const edges: KeyboardDockEdges = { bottom: value, left: value, right: value };
    const zeroStyle = { marginBottom: "0px", marginLeft: "0px", marginRight: "0px" };

    expect(keyboardDockEdgesOf(insets)).toEqual({ bottom: 0, left: 0, right: 0 });
    expect(keyboardDockBodyStyle(edges, "body")).toEqual(zeroStyle);
    expect(keyboardDockBodyStyle(edges, "keyboard")).toEqual(zeroStyle);
    expect(keyboardRowsInsetStyle(edges)).toEqual(zeroStyle);
  });
});

describe("순수성", () => {
  test("KD6. 얼린 입력도 같은 결과이고 입력은 그대로이며 반복해도 같다", () => {
    const frozen = Object.freeze({ ...wide });
    const edges = Object.freeze({ bottom: 48, left: 44, right: 12 });

    expect(keyboardDockEdgesOf(frozen)).toEqual(keyboardDockEdgesOf({ ...wide }));
    expect(keyboardDockEdgesOf(frozen)).toEqual(keyboardDockEdgesOf(frozen));
    expect(frozen).toEqual(wide);
    expect(keyboardDockBodyStyle(edges, "body")).toEqual(keyboardDockBodyStyle(edges, "body"));
    expect(keyboardRowsInsetStyle(edges)).toEqual(keyboardRowsInsetStyle(edges));
    expect(edges).toEqual({ bottom: 48, left: 44, right: 12 });
  });
});
