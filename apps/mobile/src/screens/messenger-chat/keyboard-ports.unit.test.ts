import { expect, test } from "vitest";

import { emptyKeyboardHeightStore, unknownKoreanKeyboardProbe } from "./keyboard-ports";

// `unit` 계층(MC-U23): 1단계 네이티브 자리 포트 — 늘 모름 · 늘 없음.

test("MC-U23. 탐지 포트는 늘 unknown이다 — 여러 번 불러도", () => {
  expect(unknownKoreanKeyboardProbe.presence()).toBe("unknown");
  expect(unknownKoreanKeyboardProbe.presence()).toBe("unknown");
});

test("MC-U23. 높이 저장 포트는 늘 null이다", () => {
  expect(emptyKeyboardHeightStore.read()).toBeNull();
  expect(emptyKeyboardHeightStore.read()).toBeNull();
});
