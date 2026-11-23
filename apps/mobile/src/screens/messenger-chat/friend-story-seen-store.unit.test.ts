import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { deviceStorySeenStore, FRIEND_STORY_SEEN_KEY } from "./friend-story-seen-store";

// `unit` 계층(FS-U12): 본 친구 스토리 표시는 계정마다 기기에 적는다(ADR-0177 D3).

const NOW = 1_800_000_000_000;
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FS-U12 본 것 저장", () => {
  test("적은 스토리는 같은 계정에서 본 것 · 다른 계정은 아니다", () => {
    const a = deviceStorySeenStore("server:a");
    expect([...a.seenIds()]).toEqual([]);
    a.markSeen("s1", NOW + 1000, NOW);
    expect([...a.seenIds()]).toEqual(["s1"]);
    expect([...deviceStorySeenStore("server:a").seenIds()]).toEqual(["s1"]);
    expect([...deviceStorySeenStore("server:b").seenIds()]).toEqual([]);
    expect(JSON.parse(store.get(FRIEND_STORY_SEEN_KEY) ?? "{}")).toEqual({
      "server:a": { s1: NOW + 1000 },
    });
  });

  test("적을 때 만료가 지난 표시는 지우고, 다른 계정 기록은 남긴다", () => {
    store.set(
      FRIEND_STORY_SEEN_KEY,
      JSON.stringify({ "server:a": { old: NOW - 1 }, "server:b": { x: NOW + 5 } }),
    );
    deviceStorySeenStore("server:a").markSeen("s2", NOW + 9, NOW);
    expect(JSON.parse(store.get(FRIEND_STORY_SEEN_KEY) ?? "{}")).toEqual({
      "server:a": { s2: NOW + 9 },
      "server:b": { x: NOW + 5 },
    });
  });

  test("망가진 값은 빈 표시 — 숫자가 아닌 칸은 버린다", () => {
    store.set(FRIEND_STORY_SEEN_KEY, "not json");
    expect([...deviceStorySeenStore("server:a").seenIds()]).toEqual([]);
    store.set(FRIEND_STORY_SEEN_KEY, JSON.stringify({ "server:a": { a: "x", b: NOW } }));
    expect([...deviceStorySeenStore("server:a").seenIds()]).toEqual(["b"]);
  });
});
