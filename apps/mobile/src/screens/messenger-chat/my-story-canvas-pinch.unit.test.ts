import { expect, test } from "vitest";

import { canvasPinch, dropLoose, looseFingers } from "./my-story-touch";

// `unit` 계층(SP-U1 ~ U3, 2026-11-27): 고른 스티커를 바탕 어디든 두 손가락으로(인스타그램 스토리 감각). 바탕에 닿아 아직 아무것도
// 잡지 않은 손가락(loose)을 세고, 둘이 되면 고른 것을 잡습니다. 고른 것이 없으면 아무것도 하지 않습니다(ADR-0194 개정 3).

const f = (id: number, x = 0, y = 0) => ({ id, x, y });

test("SP-U1. 바탕 손가락 — 새로 닿은 것을 둘까지 더하고, 이벤트의 touches에 없는 것(끝을 못 받음)은 버림", () => {
  expect(looseFingers([], [f(0)], [f(0)])).toEqual([0]);
  expect(looseFingers([0], [f(1)], [f(0), f(1)])).toEqual([0, 1]);
  // 이미 있는 손가락은 그대로 · 셋째는 더하지 않음
  expect(looseFingers([0, 1], [f(1), f(2)], [f(0), f(1), f(2)])).toEqual([0, 1]);
  // 손가락 0의 끝을 못 받음 — touches에 없으니 버리고 새 손가락부터
  expect(looseFingers([0], [f(4)], [f(4)])).toEqual([4]);
});

test("SP-U2. 바탕 손가락을 뗌 — 뗀 것만 빠짐", () => {
  expect(dropLoose([0, 1], [f(1)])).toEqual([0]);
  expect(dropLoose([0, 1], [f(7)])).toEqual([0, 1]);
  expect(dropLoose([0], [f(0)])).toEqual([]);
});

test("SP-U3. 두 손가락 대상 — 고른 것이 있고 바탕 손가락이 둘일 때만 그 둘, 고른 것이 없으면 아무것도 안 함", () => {
  expect(canvasPinch([0, 1], true)).toEqual([0, 1]);
  expect(canvasPinch([0], true)).toBeNull();
  expect(canvasPinch([0, 1], false)).toBeNull();
  expect(canvasPinch([], false)).toBeNull();
});
