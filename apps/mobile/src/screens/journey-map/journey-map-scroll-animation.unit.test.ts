import { expect, test } from "vitest";

import { mapScrollDurationMs } from "./journey-map-scroll-animation";
import {
  forgetMapScroll,
  rememberedMapScroll,
  rememberMapScroll,
} from "./journey-map-scroll-memory";

test("[SA1] 길이는 거리에 맞추되 0.7 ~ 1.1초로 묶인다", () => {
  expect(mapScrollDurationMs(0)).toBe(700);
  expect(mapScrollDurationMs(800)).toBe(880);
  expect(mapScrollDurationMs(-800)).toBe(880);
  expect(mapScrollDurationMs(5000)).toBe(1100);
});

test("[SA4] 맵 자리는 이 실행 동안만 기억된다 — 처음엔 null, 스크롤 뒤엔 그 자리", () => {
  forgetMapScroll();
  expect(rememberedMapScroll()).toBeNull();
  rememberMapScroll(320);
  expect(rememberedMapScroll()).toBe(320);
  rememberMapScroll(-5);
  expect(rememberedMapScroll()).toBe(0);
});
