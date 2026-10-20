import { expect, test, vi } from "vitest";

import {
  animateMapScroll,
  easeInOutCubic,
  mapScrollDurationMs,
  mapScrollFrameAt,
} from "./journey-map-scroll-animation";
import {
  forgetMapScroll,
  rememberedMapScroll,
  rememberMapScroll,
} from "./journey-map-scroll-memory";

test("[SA1] 길이는 거리에 맞추되 0.5 ~ 0.9초로 묶인다", () => {
  expect(mapScrollDurationMs(0)).toBe(500);
  expect(mapScrollDurationMs(500)).toBe(600);
  expect(mapScrollDurationMs(-500)).toBe(600);
  expect(mapScrollDurationMs(5000)).toBe(900);
});

test("[SA2] 천천히 출발해 천천히 멈춘다 — 가운데가 가장 빠르고 끝은 정확히 끝", () => {
  expect(easeInOutCubic(0)).toBe(0);
  expect(easeInOutCubic(0.5)).toBe(0.5);
  expect(easeInOutCubic(1)).toBe(1);
  expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
  expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  expect(mapScrollFrameAt(100, 500, 9999, 600)).toBe(500);
  expect(mapScrollFrameAt(100, 500, 300, 600)).toBe(300);
});

test("[SA3] 프레임마다 옮기고 끝 자리에서 멈추며, 멈춤 함수를 부르면 더 옮기지 않는다", () => {
  vi.useFakeTimers();
  let now = 0;
  const moves: number[] = [];
  animateMapScroll(
    0,
    400,
    160,
    (top) => moves.push(top),
    () => now,
  );
  for (let i = 0; i < 20; i += 1) {
    now += 16;
    vi.advanceTimersByTime(16);
  }
  expect(moves[0]).toBe(0);
  expect(moves.at(-1)).toBe(400);
  const count = moves.length;
  vi.advanceTimersByTime(200);
  expect(moves).toHaveLength(count);

  now = 0;
  const stoppedMoves: number[] = [];
  const stop = animateMapScroll(
    0,
    400,
    160,
    (top) => stoppedMoves.push(top),
    () => now,
  );
  stop();
  now += 16;
  vi.advanceTimersByTime(100);
  expect(stoppedMoves).toEqual([0]);
  vi.useRealTimers();
});

test("[SA4] 맵 자리는 이 실행 동안만 기억된다 — 처음엔 null, 스크롤 뒤엔 그 자리", () => {
  forgetMapScroll();
  expect(rememberedMapScroll()).toBeNull();
  rememberMapScroll(320);
  expect(rememberedMapScroll()).toBe(320);
  rememberMapScroll(-5);
  expect(rememberedMapScroll()).toBe(0);
});
