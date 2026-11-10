import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { keyboardRowsInsetStyle, zeroKeyboardDockEdges } from "../../lib/keyboard-dock";
import type { KeyboardDockEdges } from "../../lib/keyboard-dock";
import { KEY_REPEAT } from "../../lib/key-repeat";
import { hangulKeyRows } from "./hangul-keyboard";
import { MessengerKeyboard } from "./MessengerKeyboard";

// `ui` 계층: 자판 면 안 키 줄 묶음이 인셋 바깥 여백을 지고, 칸이 touchstart에 한 번 입력하며
// (같은 누름의 tap은 버림 · tap만 오면 입력), 눌림 · 말풍선 · 힌트 · 지우기 반복이 계약대로인지 봅니다(ADR-0112).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const edges: KeyboardDockEdges = { bottom: 34, left: 44, right: 12 };

function mount(dock: KeyboardDockEdges = edges, shifted = false) {
  const handlers = {
    onPress: vi.fn<(key: string) => void>(),
    onBackspace: vi.fn<() => void>(),
    onShift: vi.fn<() => void>(),
  };
  const view = render(<MessengerKeyboard shifted={shifted} edges={dock} {...handlers} />);
  return { ...handlers, unmount: view.unmount };
}

/** 요소가 없으면 `null`이라 단언이 실패로 말합니다. */
function marginsOf(testId: string) {
  const node = screen.queryByTestId(testId);
  if (node === null) return null;
  const { marginBottom, marginLeft, marginRight } = node.style;
  return { marginBottom, marginLeft, marginRight };
}

const key = (id: string) => screen.getByTestId(`messenger-key-${id}`);
const touchStart = (id: string) => fireEvent.touchstart(key(id), { touches: [{ identifier: 0 }] });
const touchEnd = (id: string) => fireEvent.touchend(key(id), {});
const touchCancel = (id: string) => fireEvent.touchcancel(key(id), {});
const tap = (id: string) => fireEvent.tap(key(id), {});
const pressedOf = (id: string) => key(id).getAttribute("data-pressed");
const previews = () => screen.queryAllByTestId("messenger-key-preview");

const keyIds = [...hangulKeyRows.flat(), "shift", "backspace", "space", ".", "?"];

describe("MessengerKeyboard", () => {
  test("KT-UI1. 키 줄 묶음이 면의 유일한 자식이고 인셋이 그 묶음의 바깥 여백이다", () => {
    mount(edges);
    const face = screen.getByTestId("messenger-keyboard");

    expect(Array.from(face.children).map((child) => child.getAttribute("data-testid"))).toEqual([
      "messenger-keyboard-rows",
    ]);
    expect(marginsOf("messenger-keyboard-rows")).toEqual(keyboardRowsInsetStyle(edges));
    expect(face.style.cssText).not.toMatch(/padding|margin/);
  });

  test("KT-UI1. 인셋이 0이면 묶음 바깥 여백 셋이 모두 0px이다", () => {
    mount(zeroKeyboardDockEdges);

    expect(marginsOf("messenger-keyboard-rows")).toEqual({
      marginBottom: "0px",
      marginLeft: "0px",
      marginRight: "0px",
    });
  });

  test("KT-UI2. 키 서른하나가 키 줄 묶음 안에 있고 쉼표는 없다, 칸마다 버튼 역할 · 라벨", () => {
    mount();
    const rows = screen.getByTestId("messenger-keyboard-rows");

    expect(keyIds).toHaveLength(31);
    for (const id of keyIds) {
      const cell = key(id);
      expect(rows.contains(cell)).toBe(true);
      expect(cell.getAttribute("accessibility-traits")).toBe("button");
      expect(cell.getAttribute("accessibility-label")).not.toBe("");
    }
    expect(screen.queryByTestId("messenger-key-,")).toBeNull();
    expect(key("ㅂ").getAttribute("accessibility-label")).toBe("ㅂ");
    expect(key("space").getAttribute("accessibility-label")).toBe("Space");
  });

  test("KT-UI3. touchstart에 한 번 입력하고 같은 누름의 touchend · tap은 더하지 않는다", () => {
    const handlers = mount();

    touchStart("ㅂ");
    expect(handlers.onPress).toHaveBeenCalledTimes(1);
    expect(handlers.onPress).toHaveBeenCalledWith("ㅂ");
    touchEnd("ㅂ");
    tap("ㅂ");
    expect(handlers.onPress).toHaveBeenCalledTimes(1);

    touchStart("space");
    touchEnd("space");
    tap("space");
    expect(handlers.onPress).toHaveBeenLastCalledWith(" ");
    expect(handlers.onPress).toHaveBeenCalledTimes(2);
  });

  test("KT-UI4. tap만 오면(스크린리더) 각 키가 한 번씩 동작한다", () => {
    const handlers = mount();

    tap("ㅂ");
    expect(handlers.onPress).toHaveBeenCalledTimes(1);
    expect(handlers.onPress).toHaveBeenCalledWith("ㅂ");
    tap("shift");
    expect(handlers.onShift).toHaveBeenCalledTimes(1);
    tap("backspace");
    expect(handlers.onBackspace).toHaveBeenCalledTimes(1);
    tap("?");
    expect(handlers.onPress).toHaveBeenLastCalledWith("?");
  });

  // 자판은 기본 자모를 올리고 쌍자음 적용은 입력창 리듀서가 자기 윗글쇠 상태로 한다(예전 계약 — 코드 리뷰 #403).
  test("KT-UI5. 윗글쇠가 켜져도 기본 자모를 올리고, 힌트가 사라지며 윗글쇠 칸이 켜짐을 알린다", () => {
    const handlers = mount(edges, true);

    touchStart("ㅂ");
    expect(handlers.onPress).toHaveBeenCalledWith("ㅂ");
    expect(screen.queryByTestId("messenger-key-hint-ㅂ")).toBeNull();
    expect(key("shift").getAttribute("data-shifted")).toBe("true");
    expect(key("ㅂ").getAttribute("accessibility-label")).toBe("ㅃ");
  });

  test("KT-UI6. 누르는 동안 눌림 · 말풍선, 손을 떼거나 취소되면 사라진다", () => {
    mount();

    expect(pressedOf("ㅇ")).toBe("false");
    touchStart("ㅇ");
    expect(pressedOf("ㅇ")).toBe("true");
    expect(previews()).toHaveLength(1);
    expect(previews()[0]?.textContent).toBe("ㅇ");
    touchEnd("ㅇ");
    expect(pressedOf("ㅇ")).toBe("false");
    expect(previews()).toHaveLength(0);

    touchStart("ㅏ");
    touchCancel("ㅏ");
    expect(pressedOf("ㅏ")).toBe("false");
    expect(previews()).toHaveLength(0);
  });

  test("KT-UI7. 끝 이벤트가 오지 않아도 1,500ms 뒤 눌림이 풀린다", () => {
    vi.useFakeTimers();
    mount();

    touchStart("ㅇ");
    act(() => {
      vi.advanceTimersByTime(1_499);
    });
    expect(pressedOf("ㅇ")).toBe("true");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(pressedOf("ㅇ")).toBe("false");
    expect(previews()).toHaveLength(0);
  });

  test("KT-UI8. 윗글쇠 · 지우기 · 띄어쓰기는 말풍선이 없다", () => {
    mount();

    for (const id of ["shift", "backspace", "space"]) {
      touchStart(id);
      expect(pressedOf(id)).toBe("true");
      expect(previews()).toHaveLength(0);
      touchEnd(id);
    }
  });

  test("KT-UI9. 힌트 일곱 칸 — 칸 안에 있고 칸 라벨에는 섞이지 않는다", () => {
    mount();

    const hinted = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅐ", "ㅔ"];
    expect(screen.queryAllByTestId(/^messenger-key-hint-/)).toHaveLength(7);
    for (const id of hinted) {
      const hint = screen.getByTestId(`messenger-key-hint-${id}`);
      expect(key(id).contains(hint)).toBe(true);
      expect(key(id).getAttribute("accessibility-label")).toBe(id);
    }
    expect(screen.getByTestId("messenger-key-hint-ㅂ").textContent).toBe("ㅃ");
  });

  test("KT-UI10. 지우기를 누르면 한 번, 지연 뒤 간격마다 반복, 손을 떼면 멈춘다", () => {
    vi.useFakeTimers();
    const handlers = mount();

    touchStart("backspace");
    expect(handlers.onBackspace).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(KEY_REPEAT.delayMs);
    expect(handlers.onBackspace).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(KEY_REPEAT.intervalMs * 2);
    expect(handlers.onBackspace).toHaveBeenCalledTimes(4);
    touchEnd("backspace");
    tap("backspace");
    vi.advanceTimersByTime(5_000);
    expect(handlers.onBackspace).toHaveBeenCalledTimes(4);
  });

  test("KT-UI11. 지우기를 누른 채 사라지면 반복이 멈춘다", () => {
    vi.useFakeTimers();
    const handlers = mount();

    touchStart("backspace");
    handlers.unmount();
    vi.advanceTimersByTime(10_000);
    expect(handlers.onBackspace).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("KT-UI12. 겹친 두 누름(두 손가락)도 각자 한 번씩 순서대로", () => {
    const handlers = mount();

    touchStart("ㅇ");
    touchStart("ㅏ");
    touchEnd("ㅇ");
    tap("ㅇ");
    touchEnd("ㅏ");
    tap("ㅏ");
    expect(handlers.onPress.mock.calls.map(([value]) => value)).toEqual(["ㅇ", "ㅏ"]);
  });

  test("KT-UI13. 키 진동 — touchstart마다 한 번, 같은 누름의 tap · 반복 삭제에는 없다", () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    vi.stubGlobal("NativeModules", {
      SoundEffectsModule: {
        play: () => {},
        stopRing: () => {},
        haptic: (kind: string) => calls.push(kind),
      },
    });
    mount();

    touchStart("ㅂ");
    touchEnd("ㅂ");
    tap("ㅂ");
    tap("ㅈ");
    touchStart("backspace");
    vi.advanceTimersByTime(KEY_REPEAT.delayMs + KEY_REPEAT.intervalMs * 3);
    touchEnd("backspace");

    expect(calls).toEqual(["key", "key", "key"]);
  });

  // a11y M5: 끝 이벤트가 빠져도 지우기 반복이 오래 가지 않는다 — 다른 키를 누르면 멈춘다.
  test("KT-UI14. 지우기 반복 중 다른 키를 누르면 반복이 멈춘다", () => {
    vi.useFakeTimers();
    const handlers = mount();

    touchStart("backspace");
    act(() => {
      vi.advanceTimersByTime(KEY_REPEAT.delayMs);
    });
    expect(handlers.onBackspace).toHaveBeenCalledTimes(2);
    touchStart("ㅂ");
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(handlers.onBackspace).toHaveBeenCalledTimes(2);
    expect(pressedOf("backspace")).toBe("false");
  });

  // a11y M5 · review W3: 끝 이벤트가 빠져도 반복은 상한(50)에서 멈추고 타이머가 남지 않는다.
  test("KT-UI15. 끝 이벤트 없는 지우기 반복은 상한에서 멈추고 타이머가 남지 않는다", () => {
    vi.useFakeTimers();
    const handlers = mount();

    touchStart("backspace");
    act(() => {
      vi.advanceTimersByTime(KEY_REPEAT.delayMs + KEY_REPEAT.intervalMs * 100);
    });
    expect(handlers.onBackspace).toHaveBeenCalledTimes(1 + KEY_REPEAT.maxRepeats);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  // review W6: 겹친 두 누름이 tap 없이(touchstart만으로) 각자 한 번씩.
  test("KT-UI19. 겹친 두 누름은 tap 없이도 각자 한 번씩 순서대로", () => {
    const handlers = mount();

    touchStart("ㅇ");
    touchStart("ㅏ");
    touchEnd("ㅇ");
    touchEnd("ㅏ");
    expect(handlers.onPress.mock.calls.map(([value]) => value)).toEqual(["ㅇ", "ㅏ"]);
  });

  // a11y M1: 윗글쇠를 켜는 누름 동안 아이콘이 눌림 면 위에서 보이게(흰색 2.1:1 → gray-900).
  test("KT-UI16. 켜진 윗글쇠를 누르는 동안 아이콘은 어두운 색이다", () => {
    mount(edges, true);
    const icon = () => key("shift").querySelector("svg");

    expect(icon()?.getAttribute("current-color")).toBe("#FFFFFF");
    touchStart("shift");
    expect(icon()?.getAttribute("current-color")).not.toBe("#FFFFFF");
  });

  // a11y M2 · M3: 라벨 · 힌트는 잘리는 면 안에, 말풍선은 그 밖에. 힌트 · 말풍선 글자는 낭독에서 뺀다.
  test("KT-UI17. 라벨 · 힌트는 잘리는 면 안, 말풍선은 면 밖 · 힌트와 말풍선은 접근성 요소가 아니다", () => {
    mount();
    touchStart("ㅂ");
    const face = key("ㅂ").querySelector(".messenger-keyboard-key-face");
    const hint = screen.getByTestId("messenger-key-hint-ㅂ");
    const preview = previews()[0];

    expect(face).not.toBeNull();
    expect(face?.contains(hint)).toBe(true);
    expect(preview).toBeDefined();
    expect(face?.contains(preview ?? null)).toBe(false);
    expect(hint.getAttribute("accessibility-element")).toBe("false");
    expect(preview?.querySelector("text")?.getAttribute("accessibility-element")).toBe("false");
  });

  // 기기 확인에서 찾음: 윗글쇠는 한 번 쓰이면 꺼지므로, 눌린 동안의 말풍선은 누른 순간의 글자(ㅃ)여야 한다.
  test("KT-UI18. 윗글쇠로 누른 키의 말풍선은 윗글쇠가 꺼진 뒤에도 누른 글자다", () => {
    const handlers = {
      onPress: vi.fn<(key: string) => void>(),
      onBackspace: vi.fn<() => void>(),
      onShift: vi.fn<() => void>(),
    };
    const view = render(<MessengerKeyboard shifted={true} edges={edges} {...handlers} />);

    touchStart("ㅂ");
    expect(handlers.onPress).toHaveBeenCalledWith("ㅂ");
    view.rerender(<MessengerKeyboard shifted={false} edges={edges} {...handlers} />);

    expect(previews()[0]?.textContent).toBe("ㅃ");
  });

  // 코드 리뷰 #403: 다시 그리기 전에 두 키가 연달아 와도(두 손가락) 윗글쇠를 자판이 두 번 쓰지 않는다 —
  // 둘 다 기본 자모로 올리고, 한 번만 먹는 윗글쇠는 리듀서가 적용한다.
  test("KT-UI20. 윗글쇠가 켜진 채 다시 그리기 전에 두 키가 와도 둘 다 기본 자모다", () => {
    const handlers = mount(edges, true);

    touchStart("ㅂ");
    touchStart("ㅈ");
    expect(handlers.onPress.mock.calls.map(([value]) => value)).toEqual(["ㅂ", "ㅈ"]);
  });

  // 코드 리뷰 #403: 말풍선은 위 줄을 덮으므로 터치를 받지 않는다 — 그 아래 키가 받는다.
  test("KT-UI21. 말풍선은 터치를 받지 않는다", () => {
    mount();
    touchStart("ㅁ");

    expect(previews()[0]?.getAttribute("user-interaction-enabled")).toBe("false");
  });
});
