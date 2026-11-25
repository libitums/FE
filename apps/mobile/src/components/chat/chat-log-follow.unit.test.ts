import { describe, expect, test } from "vitest";

import {
  NEAR_END_PX,
  SHORT_SCROLL_PX,
  endDistance,
  farFromEnd,
  realignOnShrink,
  smoothToEnd,
} from "./chat-log-follow";

// `unit` 계층(chat-scroll-follow A · D · E): 끝까지 남은 거리 · 부드럽게 갈지 · 뷰포트가 줄 때 다시 맞출지.

describe("endDistance", () => {
  test("CLF-U1. 끝까지 남은 거리 = scrollHeight − scrollTop − 뷰포트, 값이 없으면 null", () => {
    expect(endDistance({ scrollTop: 100, scrollHeight: 1000 }, 400)).toBe(500);
    expect(endDistance({ scrollTop: 600, scrollHeight: 1000 }, 400)).toBe(0);
    expect(endDistance({ scrollTop: 100, scrollHeight: 1000 }, null)).toBeNull();
    expect(endDistance({ scrollHeight: 1000 }, 400)).toBeNull();
    expect(endDistance(null, 400)).toBeNull();
  });
});

describe("smoothToEnd", () => {
  test("CLF-U2. 먼 끝은 부드럽게, 짧은 거리 · 첫 진입 · 움직임 줄이기는 점프", () => {
    expect(smoothToEnd({ motion: true, entering: false, distance: 800 })).toBe(true);
    expect(smoothToEnd({ motion: true, entering: false, distance: null })).toBe(true);
    expect(smoothToEnd({ motion: true, entering: false, distance: SHORT_SCROLL_PX })).toBe(false);
    expect(smoothToEnd({ motion: true, entering: false, distance: 20 })).toBe(false);
    expect(smoothToEnd({ motion: true, entering: true, distance: 800 })).toBe(false);
    expect(smoothToEnd({ motion: false, entering: false, distance: 800 })).toBe(false);
  });
});

describe("farFromEnd", () => {
  test("CLF-U5. 끝까지 남은 거리가 뷰포트보다 클 때만 한 화면 넘게 멀다 — 모르면 아님", () => {
    expect(farFromEnd(500, 400)).toBe(true);
    expect(farFromEnd(400, 400)).toBe(false);
    expect(farFromEnd(null, 400)).toBe(false);
    expect(farFromEnd(500, null)).toBe(false);
  });
});

describe("realignOnShrink", () => {
  test("CLF-U3. 뷰포트가 줄었고 끝 근처였을 때만 다시 맞춘다", () => {
    expect(realignOnShrink(600, 420, true)).toBe(true);
    expect(realignOnShrink(600, 420, false)).toBe(false);
    expect(realignOnShrink(420, 600, true)).toBe(false);
    expect(realignOnShrink(600, 600, true)).toBe(false);
    expect(realignOnShrink(null, 420, true)).toBe(false);
  });

  test("CLF-U4. 끝 근처 기준은 48px다(ADR-0117 개정)", () => {
    expect(NEAR_END_PX).toBe(48);
  });
});
