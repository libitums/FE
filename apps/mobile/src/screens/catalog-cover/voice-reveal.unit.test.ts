import { defaultRevealIntervalMs } from "@libitums/ui-lynx/typewriter";
import { describe, expect, test } from "vitest";

import {
  VOICE_REVEAL_MAX_INTERVAL_MS,
  VOICE_REVEAL_MIN_INTERVAL_MS,
  voiceRevealIntervalMs,
} from "./voice-reveal";

// `unit` 계층: 맞출 길이 · 대사 → 글자 간격. 안전 범위 [35, 300]ms(사용자 확정).

const text = (count: number): string => "a".repeat(count);

describe("voiceRevealIntervalMs", () => {
  test("VR1. 범위 안이면 floor(길이 / code point 수)다", () => {
    expect(voiceRevealIntervalMs(1763, "어서 오세요.")).toBe(251);
    expect(voiceRevealIntervalMs(2027, "사장님, 손님 오셨어요!")).toBe(155);
    expect(voiceRevealIntervalMs(882, "봉투 드릴까요?")).toBe(110);
    const seven = voiceRevealIntervalMs(1000, "abcdefg");
    expect(seven).toBe(142);
    expect(Number.isInteger(seven)).toBe(true);
  });

  test("VR2. [35, 300]으로 묶는다", () => {
    expect(voiceRevealIntervalMs(2299, "어서 오세요.")).toBe(300);
    expect(voiceRevealIntervalMs(100000, "네.")).toBe(300);
    expect(voiceRevealIntervalMs(10, "abcdef")).toBe(35);
    expect(voiceRevealIntervalMs(300 * 7, text(7))).toBe(300);
    expect(voiceRevealIntervalMs(301 * 7, text(7))).toBe(300);
    expect(voiceRevealIntervalMs(35 * 4, text(4))).toBe(35);
    expect(voiceRevealIntervalMs(34 * 4, text(4))).toBe(35);
    expect(voiceRevealIntervalMs(36 * 4, text(4))).toBe(36);
  });

  test.each<[string, number | null, string]>([
    ["null", null, "어서 오세요."],
    ["0", 0, "어서 오세요."],
    ["음수", -1, "어서 오세요."],
    ["NaN", Number.NaN, "어서 오세요."],
    ["Infinity", Number.POSITIVE_INFINITY, "어서 오세요."],
    ["-Infinity", Number.NEGATIVE_INFINITY, "어서 오세요."],
    ["빈 대사", 1763, ""],
  ])("VR3. 길이가 없거나 못 쓰는 값(%s)이면 기본 간격이다", (_name, length, line) => {
    expect(voiceRevealIntervalMs(length, line)).toBe(defaultRevealIntervalMs);
  });

  test("VR3. 상수: 기본 간격 35 · 하한 = 기본 간격 · 상한 300", () => {
    expect(defaultRevealIntervalMs).toBe(35);
    expect(VOICE_REVEAL_MIN_INTERVAL_MS).toBe(defaultRevealIntervalMs);
    expect(VOICE_REVEAL_MAX_INTERVAL_MS).toBe(300);
  });

  test("VR4. 글자 수는 code point이고 독백 괄호도 센다", () => {
    expect(voiceRevealIntervalMs(400, "😀😀")).toBe(200);
    expect(voiceRevealIntervalMs(900, "(목이 마르다.)")).toBe(100);
  });
});
