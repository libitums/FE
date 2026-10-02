import { afterEach, expect, test, vi } from "vitest";

import { playSound, stopRing } from "./sound-effects";

afterEach(() => vi.unstubAllGlobals());

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

test.each([undefined, null, {}, { SoundEffectsModule: null }])(
  "모듈이 %s이면 Android·테스트 환경에서 던지지 않는다",
  (nativeModules) => {
    if (nativeModules !== undefined) vi.stubGlobal("NativeModules", nativeModules);

    expect(() => playSound("button")).not.toThrow();
    expect(() => stopRing()).not.toThrow();
  },
);
