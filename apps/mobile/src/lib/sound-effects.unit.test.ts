import { afterEach, expect, test, vi } from "vitest";

import { hapticFor, playSound, stopRing } from "./sound-effects";
import type { HapticKind, SoundEffectId } from "./sound-effects";

afterEach(() => vi.unstubAllGlobals());

/** 새 호스트 모의 — play · haptic을 한 배열에 순서대로 적는다. `vibration`을 주면 그 값이 저장된 진동 설정이다. */
function stubHost(
  calls: string[],
  overrides: Record<string, unknown> = {},
  vibration?: string | null,
) {
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: (id: string) => calls.push(`play:${id}`),
      stopRing: () => calls.push("stopRing"),
      haptic: (kind: string) => calls.push(`haptic:${kind}`),
      ...overrides,
    },
    ...(vibration === undefined
      ? {}
      : {
          StorageModule: {
            get: (key: string) => (key === "libitum.session-option.vibration" ? vibration : null),
            set: () => {},
            remove: () => {},
          },
        }),
  });
}

test("iOS 효과음 모듈에 안정적인 자산 ID를 전달한다", () => {
  const play = vi.fn();
  vi.stubGlobal("NativeModules", { SoundEffectsModule: { play, stopRing: vi.fn() } });

  playSound("correct_answer");
  playSound("failed_lesson");

  expect(play).toHaveBeenNthCalledWith(1, "correct_answer");
  expect(play).toHaveBeenNthCalledWith(2, "failed_lesson");
});

test("벨 중지만 별도 네이티브 메서드로 보낸다", () => {
  const play = vi.fn();
  const stop = vi.fn();
  vi.stubGlobal("NativeModules", { SoundEffectsModule: { play, stopRing: stop } });

  playSound("ring_bell");
  stopRing();

  expect(play).toHaveBeenCalledWith("ring_bell");
  expect(stop).toHaveBeenCalledOnce();
});

// HF-U9: 진동이 붙는 id도 모듈이 없는 환경에서 던지지 않는다.
test.each([undefined, null, {}, { SoundEffectsModule: null }])(
  "모듈이 %s이면 모듈이 없는 환경에서 던지지 않는다",
  (nativeModules) => {
    if (nativeModules !== undefined) vi.stubGlobal("NativeModules", nativeModules);

    expect(() => playSound("button")).not.toThrow();
    expect(() => playSound("correct_answer")).not.toThrow();
    expect(() => stopRing()).not.toThrow();
  },
);

// HF-U1
test.each<[SoundEffectId, HapticKind | null]>([
  ["correct_answer", "success"],
  ["pass_lesson", "success"],
  ["wrong_answer", "error"],
  ["failed_lesson", "error"],
  ["button", null],
  ["lesson_complete", null],
  ["ring_bell", null],
  ["accept_call", null],
])("진동 정책: %s → %s", (id, kind) => {
  expect(hapticFor(id)).toBe(kind);
});

// HF-U2
test.each<[SoundEffectId, HapticKind]>([
  ["correct_answer", "success"],
  ["pass_lesson", "success"],
  ["wrong_answer", "error"],
  ["failed_lesson", "error"],
])("판정 효과음 %s은 효과음과 함께 %s 진동을 한 번 요청한다", (id, kind) => {
  const calls: string[] = [];
  stubHost(calls);

  playSound(id);

  expect(calls.filter((call) => call.startsWith("play:"))).toEqual([`play:${id}`]);
  expect(calls.filter((call) => call.startsWith("haptic:"))).toEqual([`haptic:${kind}`]);
});

// HF-U3
test.each<SoundEffectId>(["button", "lesson_complete", "ring_bell", "accept_call"])(
  "%s은 효과음만 내고 진동을 요청하지 않는다",
  (id) => {
    const calls: string[] = [];
    stubHost(calls);

    playSound(id);

    expect(calls).toEqual([`play:${id}`]);
  },
);

// HF-U4
test("효과음이 먼저, 진동이 그 뒤다", () => {
  const calls: string[] = [];
  stubHost(calls);

  playSound("correct_answer");

  expect(calls).toEqual(["play:correct_answer", "haptic:success"]);
});

// HF-U5
test.each<SoundEffectId>(["correct_answer", "wrong_answer", "pass_lesson", "failed_lesson"])(
  "진동 메서드가 없는 옛 호스트에서는 %s 효과음만 그대로 낸다",
  (id) => {
    const play = vi.fn<(id: string) => void>();
    vi.stubGlobal("NativeModules", {
      SoundEffectsModule: { play, stopRing: vi.fn<() => void>() },
    });

    expect(() => playSound(id)).not.toThrow();
    expect(play).toHaveBeenCalledExactlyOnceWith(id);
  },
);

// HF-U6
test.each([null, "x", 1])("haptic이 함수가 아니면(%s) 효과음만 내고 던지지 않는다", (haptic) => {
  const calls: string[] = [];
  stubHost(calls, { haptic });

  expect(() => playSound("correct_answer")).not.toThrow();
  expect(calls).toEqual(["play:correct_answer"]);
});

// HF-U7
test("진동 메서드가 던져도 효과음은 갔고 playSound는 던지지 않는다", () => {
  const calls: string[] = [];
  stubHost(calls, {
    haptic: () => {
      throw new Error("haptic failed");
    },
  });

  expect(() => playSound("correct_answer")).not.toThrow();
  expect(calls).toEqual(["play:correct_answer"]);
});

// HF-U8
test("효과음 재생이 던져도 진동은 그대로 요청하고 playSound는 던지지 않는다", () => {
  const calls: string[] = [];
  stubHost(calls, {
    play: () => {
      throw new Error("play failed");
    },
  });

  expect(() => playSound("correct_answer")).not.toThrow();
  expect(calls).toEqual(["haptic:success"]);
});

// HF-U10
test("벨 중지는 진동을 요청하지 않는다", () => {
  const calls: string[] = [];
  stubHost(calls);

  stopRing();

  expect(calls).toEqual(["stopRing"]);
});

// ADR-0109 D4 — 설정에서 진동을 끄면 효과음만 낸다.
test.each<SoundEffectId>(["correct_answer", "wrong_answer", "pass_lesson", "failed_lesson"])(
  "VB2. 진동 설정이 off면 %s는 효과음만 내고 진동을 요청하지 않는다",
  (id) => {
    const calls: string[] = [];
    stubHost(calls, {}, "off");

    playSound(id);

    expect(calls).toEqual([`play:${id}`]);
  },
);

test("VB2. 진동 설정이 on이거나 없으면 지금처럼 진동한다", () => {
  for (const stored of ["on", null]) {
    const calls: string[] = [];
    stubHost(calls, {}, stored);

    playSound("wrong_answer");

    expect(calls).toEqual(["play:wrong_answer", "haptic:error"]);
  }
});

test("VB2. 진동이 없는 효과음은 진동 설정을 읽지 않는다", () => {
  const get = vi.fn<(key: string) => string | null>(() => "off");
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: () => {}, stopRing: () => {}, haptic: () => {} },
    StorageModule: { get, set: () => {}, remove: () => {} },
  });

  playSound("button");

  expect(get).not.toHaveBeenCalled();
});
