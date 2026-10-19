import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { keyboardRowsInsetStyle, zeroKeyboardDockEdges } from "../../lib/keyboard-dock";
import type { KeyboardDockEdges } from "../../lib/keyboard-dock";
import { hangulKeyRows } from "./hangul-keyboard";
import { MessengerKeyboard } from "./MessengerKeyboard";

// `ui` 계층: 자판 면 안 키 줄 묶음이 인셋 바깥 여백을 지고, 키와 동작은 그대로인지 봅니다.

afterEach(() => {
  cleanup();
});

const edges: KeyboardDockEdges = { bottom: 34, left: 44, right: 12 };

function mount(dock: KeyboardDockEdges) {
  const handlers = {
    onPress: vi.fn<(key: string) => void>(),
    onBackspace: vi.fn<() => void>(),
    onShift: vi.fn<() => void>(),
  };
  render(<MessengerKeyboard shifted={false} edges={dock} {...handlers} />);
  return handlers;
}

/** 요소가 없으면 `null`이라 단언이 실패로 말합니다. */
function marginsOf(testId: string) {
  const node = screen.queryByTestId(testId);
  if (node === null) return null;
  const { marginBottom, marginLeft, marginRight } = node.style;
  return { marginBottom, marginLeft, marginRight };
}

const keyIds = [...hangulKeyRows.flat(), "shift", "backspace", "space", ",", ".", "?"].map(
  (key) => `messenger-key-${key}`,
);

describe("MessengerKeyboard", () => {
  test("KU1. 키 줄 묶음이 면의 유일한 자식이고 인셋이 그 묶음의 바깥 여백이다", () => {
    mount(edges);
    const face = screen.getByTestId("messenger-keyboard");

    expect(Array.from(face.children).map((child) => child.getAttribute("data-testid"))).toEqual([
      "messenger-keyboard-rows",
    ]);
    expect(marginsOf("messenger-keyboard-rows")).toEqual(keyboardRowsInsetStyle(edges));
    expect(marginsOf("messenger-keyboard-rows")).toEqual({
      marginBottom: "34px",
      marginLeft: "44px",
      marginRight: "12px",
    });
    expect(face.style.cssText).not.toMatch(/padding|margin/);
  });

  test("KU2. 키 서른둘이 모두 키 줄 묶음 안에 있다", () => {
    mount(edges);
    const rows = screen.queryByTestId("messenger-keyboard-rows");

    expect(keyIds).toHaveLength(32);
    expect(rows).not.toBeNull();
    for (const id of keyIds) {
      expect(rows?.contains(screen.getByTestId(id))).toBe(true);
    }
  });

  test("KU2. 키를 누르면 그 값이 한 번 올라가고 윗글쇠는 onShift를 부른다", () => {
    const handlers = mount(edges);

    fireEvent.tap(screen.getByTestId("messenger-key-ㅂ"), {});
    expect(handlers.onPress).toHaveBeenCalledTimes(1);
    expect(handlers.onPress).toHaveBeenCalledWith("ㅂ");
    fireEvent.tap(screen.getByTestId("messenger-key-shift"), {});
    expect(handlers.onShift).toHaveBeenCalledTimes(1);
    fireEvent.tap(screen.getByTestId("messenger-key-backspace"), {});
    expect(handlers.onBackspace).toHaveBeenCalledTimes(1);
  });

  test("KU2. 인셋이 0이면 묶음 바깥 여백 셋이 모두 0px이다", () => {
    mount(zeroKeyboardDockEdges);

    expect(marginsOf("messenger-keyboard-rows")).toEqual({
      marginBottom: "0px",
      marginLeft: "0px",
      marginRight: "0px",
    });
  });
});
