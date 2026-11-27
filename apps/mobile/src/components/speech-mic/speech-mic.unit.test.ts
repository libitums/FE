import { describe, expect, test } from "vitest";

import {
  SPEECH_MIC_MAX_MS,
  speechMeterOf,
  speechMicBarHeights,
  speechMicRemaining,
  speechMicRingSvg,
} from "./speech-mic";

// `unit` 계층: 공용 마이크의 음량 · 막대 · 남은 시간 계산(순수).

describe("SM1 음량 → 미터", () => {
  test("Android dB는 -2 ~ 10을 0 ~ 1로", () => {
    expect(speechMeterOf(1, -2)).toBe(0);
    expect(speechMeterOf(1, 4)).toBe(0.5);
    expect(speechMeterOf(1, 10)).toBe(1);
    expect(speechMeterOf(1, 30)).toBe(1);
  });

  test("iOS RMS는 제곱근을 키운다 — 말소리 0.05는 절반을 넘는다", () => {
    expect(speechMeterOf(0, null)).toBe(0);
    expect(speechMeterOf(0.05, null)).toBeGreaterThan(0.5);
    expect(speechMeterOf(0.5, null)).toBe(1);
    expect(speechMeterOf(Number.NaN, null)).toBe(0);
  });
});

describe("SM2 막대", () => {
  test("일곱 개, 가운데가 가장 높고 음량이 크면 높다", () => {
    const quiet = speechMicBarHeights(0.1, false);
    const loud = speechMicBarHeights(1, false);
    expect(loud).toHaveLength(7);
    expect(loud[3]).toBe(40);
    expect(Math.max(...loud)).toBe(loud[3]);
    expect(quiet[3]).toBeLessThan(loud[3] ?? 0);
    expect(speechMicBarHeights(0, false).every((height) => height === 6)).toBe(true);
  });

  test("움직임 줄이기면 음량과 상관없이 같다", () => {
    expect(speechMicBarHeights(0, true)).toEqual(speechMicBarHeights(1, true));
  });
});

describe("SM3 남은 시간 링", () => {
  test("남은 비율", () => {
    expect(speechMicRemaining(0)).toBe(1);
    expect(speechMicRemaining(SPEECH_MIC_MAX_MS / 2)).toBe(0.5);
    expect(speechMicRemaining(SPEECH_MIC_MAX_MS * 2)).toBe(0);
    expect(SPEECH_MIC_MAX_MS).toBe(8000);
  });

  test("링 SVG — 남은 만큼 호가 서고, 다 쓰면 호 길이만큼 밀린다", () => {
    const full = speechMicRingSvg(1, "#FCE0CC", "#F46B18");
    const empty = speechMicRingSvg(0, "#FCE0CC", "#F46B18");
    expect(full).toContain('stroke-dashoffset="0"');
    expect(empty).toContain('stroke-dashoffset="333"');
    expect(full).toContain('stroke="#FCE0CC"');
  });
});
