import { describe, expect, test } from "vitest";

import {
  wordChoicePictureStateAfter,
  wordChoicePictureTimeoutMs,
} from "../screens/word-choice/word-choice-picture";
import { pictureLoadStateAfter, pictureLoadTimeoutMs } from "./picture-load";
import type { PictureLoadEvent, PictureLoadState } from "./picture-load";

// `unit` 계층: 그림 로드 상태의 순수 전이 · 시한 값만 봅니다.

describe("pictureLoadStateAfter", () => {
  test("PLD1. loading은 load면 loaded, error · timeout이면 failed가 된다", () => {
    expect(pictureLoadStateAfter("loading", "load")).toBe("loaded");
    expect(pictureLoadStateAfter("loading", "error")).toBe("failed");
    expect(pictureLoadStateAfter("loading", "timeout")).toBe("failed");
  });

  test("PLD1. loaded · failed는 무엇이 와도 그대로다", () => {
    const events: readonly PictureLoadEvent[] = ["load", "error", "timeout"];
    const ends: readonly PictureLoadState[] = ["loaded", "failed"];
    for (const state of ends) {
      for (const event of events) {
        expect(pictureLoadStateAfter(state, event)).toBe(state);
      }
    }
  });

  test("PLD1. 시한은 6000 ms다", () => {
    expect(pictureLoadTimeoutMs).toBe(6000);
  });

  test("PLD2. 단어 선택의 옛 이름은 같은 값을 재수출한다", () => {
    expect(wordChoicePictureStateAfter).toBe(pictureLoadStateAfter);
    expect(wordChoicePictureTimeoutMs).toBe(pictureLoadTimeoutMs);
  });
});
