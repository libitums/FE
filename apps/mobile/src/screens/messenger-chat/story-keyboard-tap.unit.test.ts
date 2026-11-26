import { expect, test } from "vitest";

import { KEYBOARD_TAP_GRACE_MS, tapDismissesKeyboard } from "./friend-stories";

// `unit` 계층(FS-U34): 답장 키보드가 열린 채 누른 탭(ADR-0178 D5 개정 ⟨키보드 탭⟩) — 입력 칸의 blur가 탭보다 먼저 와도 그 탭은 키보드만 내린다.

const CLOSED = 10_000;

test("FS-U34. 입력 중이면 탭은 키보드만 내린다", () => {
  expect(tapDismissesKeyboard(true, null, CLOSED)).toBe(true);
  expect(tapDismissesKeyboard(true, CLOSED - 60_000, CLOSED)).toBe(true);
});

test("FS-U34. 방금 키보드가 내려갔으면(blur가 탭보다 먼저) 창 안의 탭은 키보드를 내린 탭 — 넘기지 않음", () => {
  expect(KEYBOARD_TAP_GRACE_MS).toBeGreaterThanOrEqual(300);
  expect(KEYBOARD_TAP_GRACE_MS).toBeLessThanOrEqual(1_000);
  expect(tapDismissesKeyboard(false, CLOSED, CLOSED)).toBe(true);
  expect(tapDismissesKeyboard(false, CLOSED, CLOSED + 120)).toBe(true);
  expect(tapDismissesKeyboard(false, CLOSED, CLOSED + KEYBOARD_TAP_GRACE_MS - 1)).toBe(true);
});

test("FS-U34. 창이 지났거나 내려간 기록이 없으면 평소 탭 — 넘김", () => {
  expect(tapDismissesKeyboard(false, null, CLOSED)).toBe(false);
  expect(tapDismissesKeyboard(false, CLOSED, CLOSED + KEYBOARD_TAP_GRACE_MS)).toBe(false);
  expect(tapDismissesKeyboard(false, CLOSED, CLOSED + 5_000)).toBe(false);
  // 시계가 거꾸로 간 기록(기기 시각 변경)은 믿지 않습니다.
  expect(tapDismissesKeyboard(false, CLOSED, CLOSED - 1)).toBe(false);
});
