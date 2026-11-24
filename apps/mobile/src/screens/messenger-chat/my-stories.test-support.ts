// 내 스토리 테스트 대역(ADR-0179) — 메모리 서버 · 고를 거리 · 처음 안내 · 본 반응.

import { vi } from "vitest";

import type {
  LessonCardGroup,
  MyStoriesPort,
  MyStoriesState,
  MyStory,
  MyStoryChoice,
  MyStoryDraft,
  MyStoryPostResult,
} from "./my-stories.contract";

export const MS_NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
export const MS_HOUR = 3_600_000;

export function myStory(id: string, patch: Partial<MyStory> = {}): MyStory {
  const postedAt = patch.postedAt ?? MS_NOW - 2 * MS_HOUR;
  return {
    id,
    kind: "word",
    word: { episodeId: "u01", ref: `voca:${id}` },
    ko: "야근",
    roman: "yageun",
    meaning: "overtime",
    example: { ko: "오늘도 야근이야… 피곤해", meaning: "Working late again today… tired." },
    postedAt,
    expiresAt: postedAt + 24 * MS_HOUR,
    reactions: [],
    ...patch,
  };
}

export const wordChoice = (key: string, ko = "야근", meaning = "overtime"): MyStoryChoice => ({
  key,
  kind: "word",
  word: { episodeId: "u01", ref: `voca:${key}` },
  ko,
  roman: "yageun",
  meaning,
  example: null,
  source: "Lesson 1",
});

export const cardChoice = (key: string, episodeId: string, ko: string): MyStoryChoice => ({
  key,
  kind: "card",
  word: { episodeId, ref: `voca:${key}` },
  ko,
  roman: "",
  meaning: `${ko} meaning`,
  example: { ko: `${ko}!`, meaning: "example" },
  source: episodeId,
});

export type FakeMyStories = {
  readonly port: MyStoriesPort;
  readonly post: ReturnType<typeof vi.fn<(draft: MyStoryDraft) => Promise<MyStoryPostResult>>>;
  readonly remove: ReturnType<typeof vi.fn<(id: string | null) => Promise<boolean>>>;
  readonly setKeep: ReturnType<typeof vi.fn<(keep: boolean) => Promise<boolean | null>>>;
  readonly state: () => MyStoriesState;
};

export function fakeMyStories(options: {
  readonly enabled?: boolean;
  readonly keep?: boolean;
  readonly stories?: readonly MyStory[];
  readonly words?: readonly MyStoryChoice[];
  readonly cards?: readonly LessonCardGroup[];
  readonly guideSeen?: boolean;
  readonly postResult?: MyStoryPostResult["result"];
  readonly removeOk?: boolean;
}): FakeMyStories {
  let stories = [...(options.stories ?? [])];
  let keep = options.keep ?? true;
  let guide = options.guideSeen ?? false;
  const seen = new Set<string>();
  let ids = 0;
  const state = (): MyStoriesState => ({ enabled: options.enabled ?? true, keep, stories });
  const post = vi.fn(async (draft: MyStoryDraft): Promise<MyStoryPostResult> => {
    const result = options.postResult ?? "ok";
    if (result !== "ok") return { result };
    const story = myStory(`new-${draft.clientId}`, {
      kind: draft.kind,
      word: draft.word,
      ko: draft.ko,
      roman: draft.roman,
      meaning: draft.meaning,
      example: draft.example,
      postedAt: Date.now(),
    });
    stories = [story, ...stories];
    return { result: "ok", story };
  });
  const remove = vi.fn(async (id: string | null) => {
    if (options.removeOk === false) return false;
    stories = id === null ? [] : stories.filter((story) => story.id !== id);
    return true;
  });
  const setKeep = vi.fn(async (value: boolean) => {
    keep = value;
    return value;
  });
  const port: MyStoriesPort = {
    load: async () => state(),
    post,
    remove,
    setKeep,
    choices: () => ({ words: options.words ?? [], cards: options.cards ?? [] }),
    guideSeen: () => guide,
    markGuideSeen: () => {
      guide = true;
    },
    seenReactions: () => new Set(seen),
    markReactionsSeen: (list) => {
      for (const id of list) seen.add(id);
    },
    newClientId: () => `cid-${++ids}`,
  };
  return { port, post, remove, setKeep, state };
}
