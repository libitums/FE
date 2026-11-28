import { expect, test } from "vitest";

import type { MyStoriesState, MyStory } from "./my-stories.contract";
import { MY_STORY_LIVE_MS, stateWithLive } from "./my-story-live";
import { MS_NOW, myStory, reaction } from "./my-stories.test-support";

// `unit` 계층(LV-U1 · U3 · U4): 내 스토리 보기를 연 동안 다시 읽기(ADR-0194 개정 ⟨살아 있는 보기⟩) — 주기 · 얹기.

const seen = (...ids: string[]) => ids.map((characterId) => ({ characterId, at: MS_NOW }));

test("LV-U1. 주기는 30초", () => {
  expect(MY_STORY_LIVE_MS).toBe(30_000);
});

const stateOf = (stories: readonly MyStory[]): MyStoriesState => ({
  enabled: true,
  keep: true,
  stories,
  window: null,
  kinds: [],
});

test("LV-U3. 다시 읽은 Seen by · 반응만 얹는다 — 순서 · 다른 칸 · 없는 스토리는 그대로", () => {
  const a = myStory("a", { seenBy: seen("mina") });
  const b = myStory("b");
  const loaded = [
    myStory("b", {
      seenBy: seen("mina", "haejun"),
      reactions: [reaction("r1", "haejun")],
      ko: "딴말",
    }),
    myStory("new"),
  ];
  const next = stateWithLive(stateOf([a, b]), loaded)?.stories ?? [];
  expect(next.map((story) => story.id)).toEqual(["a", "b"]);
  expect(next[0]).toBe(a);
  expect(next[1]?.seenBy.map((s) => s.characterId)).toEqual(["mina", "haejun"]);
  expect(next[1]?.reactions.map((r) => r.id)).toEqual(["r1"]);
  expect(next[1]?.ko).toBe("야근");
});

test("LV-U4. 상태가 없으면 null, 들고 있는 스토리가 목록에 없으면 그 스토리 그대로", () => {
  const story = myStory("a", { seenBy: seen("mina") });
  expect(stateWithLive(null, [story])).toBeNull();
  expect(stateWithLive(stateOf([story]), [])?.stories[0]).toBe(story);
});
