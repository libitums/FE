import { describe, expect, test } from "vitest";

import { STORY_RELOAD_MS, storiesAfterLoad } from "./friend-stories";
import { story } from "./friend-stories.test-support";

// `unit` 계층(FS-U15): 친구 스토리 다시 읽기의 판정(ADR-0178 「다시 읽기」) — 읽으면 갈아 끼우고, 못 읽으면 있던 목록을 지킨다.

const old = [story("a", { id: "st-a" })];
const fresh = [story("a", { id: "st-a" }), story("b", { id: "st-b" })];

describe("FS-U15 다시 읽은 뒤의 목록", () => {
  test("읽으면 새 목록으로 갈아 끼운다(빈 목록도 그대로 — 스토리가 다 내려감)", () => {
    expect(storiesAfterLoad(old, fresh)).toBe(fresh);
    expect(storiesAfterLoad(old, [])).toEqual([]);
    expect(storiesAfterLoad(null, fresh)).toBe(fresh);
  });

  test("못 읽으면(null) 있던 목록을 지킨다", () => {
    expect(storiesAfterLoad(old, null)).toBe(old);
    expect(storiesAfterLoad([], null)).toEqual([]);
  });

  test("첫 읽기가 실패하면 null 그대로(추천 줄)", () => {
    expect(storiesAfterLoad(null, null)).toBeNull();
  });

  test("주기는 5분", () => {
    expect(STORY_RELOAD_MS).toBe(300_000);
  });
});
