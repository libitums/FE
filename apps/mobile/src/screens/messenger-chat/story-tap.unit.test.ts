import { expect, test } from "vitest";

import { storyTapOf } from "./friend-stories";

// `unit` 계층(FS-U33): 스토리 보기의 탭 자리(ADR-0178 D4 개정 ⟨탭 자리⟩) — 화면 가운데가 경계.

test("FS-U33. 왼쪽 절반은 이전, 가운데부터 오른쪽은 다음 — 자리를 모르면 다음", () => {
  expect(storyTapOf(0, 390)).toBe("prev");
  expect(storyTapOf(140, 390)).toBe("prev");
  expect(storyTapOf(194.9, 390)).toBe("prev");
  expect(storyTapOf(195, 390)).toBe("next");
  expect(storyTapOf(200, 390)).toBe("next");
  expect(storyTapOf(389, 390)).toBe("next");
  expect(storyTapOf(undefined, 390)).toBe("next");
  expect(storyTapOf(Number.NaN, 390)).toBe("next");
  expect(storyTapOf(10, 0)).toBe("next");
});
