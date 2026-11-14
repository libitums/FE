import { expect, test } from "vitest";

import { surfaceOfTab, surfaceSeconds } from "./use-surface-sessions";

// 영역 사용 요약(ADR-0029 「D3 목적 구분」)의 순수 판정입니다.

test("SS-U1 여정 · 롤플레이는 학습, 메신저는 채팅, 설정 · 진입은 영역 아님", () => {
  expect(surfaceOfTab("journey")).toBe("learning");
  expect(surfaceOfTab("roleplay")).toBe("learning");
  expect(surfaceOfTab("messenger")).toBe("chat");
  expect(surfaceOfTab("settings")).toBeNull();
  expect(surfaceOfTab(null)).toBeNull();
});

test("SS-U2 머문 초는 반올림, 1초 미만은 세지 않는다", () => {
  expect(surfaceSeconds(0, 94_600)).toBe(95);
  expect(surfaceSeconds(0, 400)).toBeNull();
  expect(surfaceSeconds(1_000, 500)).toBeNull();
});
