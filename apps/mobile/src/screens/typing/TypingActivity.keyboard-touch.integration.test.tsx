import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { KEY_REPEAT } from "../../lib/key-repeat";
import { keystrokesFor } from "../messenger/hangul-keyboard";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";

// `integration` 계층: 자판(touchstart 입력 · tap 대체 · 지우기 반복 · 키 진동)과 받아쓰기 입력창 조합의
// 협력(ADR-0112). 조합 규칙 자체는 hangul-keyboard unit이 집니다 — 여기서는 한 누름이 입력창에 정확히
// 한 번 닿는지만 봅니다.

const dictation: TypingQuestion = {
  id: "S6-01",
  kind: "dictation",
  instruction: "Type what you read.",
  cue: "annyeonghaseyo",
  cueSupport: null,
  hint: null,
  answers: ["안녕하세요"],
  audio: null,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount() {
  return render(
    <TypingActivity
      insets={zeroSafeAreaInsets}
      questions={[dictation]}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
    />,
  );
}

const key = (id: string) => screen.getByTestId(`messenger-key-${id}`);
const answerText = () => screen.getByTestId("typing-activity-answer").textContent ?? "";

/** 손가락 한 번 — 닿고, 떼고, 뒤따르는 tap까지(실기의 이벤트 순서). */
function press(id: string) {
  fireEvent.touchstart(key(id), { touches: [{ identifier: 0 }] });
  fireEvent.touchend(key(id), {});
  fireEvent.tap(key(id), {});
}

function stubHaptic(vibration: "on" | "off" | null) {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: () => {},
      stopRing: () => {},
      haptic: (kind: string) => calls.push(kind),
    },
    StorageModule: {
      get: (storageKey: string) =>
        storageKey === "libitum.session-option.vibration" ? vibration : null,
      set: () => {},
      remove: () => {},
    },
  });
  return calls;
}

describe("TypingActivity × 자판 touch 입력", () => {
  test("KT-I1. touchstart로 친 자모가 한 번씩 조합된다 — 뒤따른 tap이 두 번 넣지 않는다", () => {
    mount();
    for (const stroke of keystrokesFor("안녕")) press(stroke);

    expect(answerText()).toContain("안녕");
    expect(answerText()).not.toContain("안안");
    expect(answerText()).not.toContain("ㅇㅇ");
  });

  test("KT-I1. 윗글쇠를 touchstart로 눌러도 한 번만 켜진다(뒤따른 tap이 끄지 않는다)", () => {
    mount();
    for (const stroke of keystrokesFor("빵")) press(stroke);

    expect(answerText()).toContain("빵");
  });

  test("KT-I1. tap이 오지 않아도 touchstart만으로 입력된다(미끄러져 tap이 취소된 경우)", () => {
    mount();
    for (const stroke of keystrokesFor("안녕")) {
      fireEvent.touchstart(key(stroke), { touches: [{ identifier: 0 }] });
      fireEvent.touchcancel(key(stroke), {});
    }

    expect(answerText()).toContain("안녕");
  });

  test("KT-I2. tap만으로(스크린리더) 같은 글자가 된다", () => {
    mount();
    for (const stroke of keystrokesFor("안녕")) fireEvent.tap(key(stroke), {});

    expect(answerText()).toContain("안녕");
  });

  test("KT-I3. 지우기를 길게 누르면 글자가 줄고 손을 떼면 멈춘다, 비어도 던지지 않는다", () => {
    vi.useFakeTimers();
    mount();
    for (const stroke of keystrokesFor("안녕하세요")) press(stroke);
    const before = answerText();

    fireEvent.touchstart(key("backspace"), { touches: [{ identifier: 0 }] });
    act(() => {
      vi.advanceTimersByTime(KEY_REPEAT.delayMs + KEY_REPEAT.intervalMs);
    });
    const during = answerText();
    expect(during.length).toBeLessThan(before.length);

    fireEvent.touchend(key("backspace"), {});
    fireEvent.tap(key("backspace"), {});
    const released = answerText();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(answerText()).toBe(released);

    fireEvent.touchstart(key("backspace"), { touches: [{ identifier: 0 }] });
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(10_000);
      }),
    ).not.toThrow();
    fireEvent.touchend(key("backspace"), {});
    expect(answerText()).not.toContain("안");
  });

  test("KT-I5. 진동 설정이 켜져 있으면 키마다 한 번, 끄면 키 입력 내내 0", () => {
    const on = stubHaptic("on");
    mount();
    for (const stroke of keystrokesFor("안")) press(stroke);
    expect(on.filter((kind) => kind === "key")).toHaveLength(keystrokesFor("안").length);
    cleanup();

    const off = stubHaptic("off");
    mount();
    for (const stroke of keystrokesFor("안녕")) press(stroke);
    expect(off).toEqual([]);
  });
});
