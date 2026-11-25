import { expect, test } from "vitest";

import { storyQuoteOf } from "./friend-stories-parse";
import { myStoriesFrom, myStoryPostFrom } from "./my-stories-parse";

// `unit` 계층(MS-U7 ~ U9): 내 스토리 서버 응답 풀기(ADR-0194) — 순수 · 던지지 않음. 인용의 kind(mine · deleted).

const wire = {
  id: "ms-1",
  kind: "card",
  word: { episodeId: "u02", ref: "voca:arrive" },
  ko: "도착하다",
  roman: "dochakada",
  meaning: "to arrive",
  example: { ko: "서울에 도착했어!", meaning: "I arrived in Seoul!" },
  postedAt: "2026-11-23T03:00:00.000Z",
  expiresAt: "2026-11-24T03:00:00.000Z",
  reactions: [
    {
      id: "r1",
      characterId: "mina",
      text: "도착하면 연락해!",
      meaning: "Text me when you arrive!",
      at: "2026-11-23T03:20:00.000Z",
    },
    { id: "r2", characterId: "haejun", text: "", meaning: null, at: "2026-11-23T04:00:00.000Z" },
  ],
};

test("MS-U7. companion_my_stories — 줄 · 반응을 풀고 틀린 반응 · 틀린 줄은 버린다, 몸이 틀리면 null", () => {
  const state = myStoriesFrom(
    JSON.stringify({ enabled: true, keep: false, stories: [wire, { id: "bad" }] }),
  );
  expect(state).toEqual({
    enabled: true,
    keep: false,
    stories: [
      {
        id: "ms-1",
        kind: "card",
        word: { episodeId: "u02", ref: "voca:arrive" },
        ko: "도착하다",
        roman: "dochakada",
        meaning: "to arrive",
        example: { ko: "서울에 도착했어!", meaning: "I arrived in Seoul!" },
        postedAt: Date.parse("2026-11-23T03:00:00.000Z"),
        expiresAt: Date.parse("2026-11-24T03:00:00.000Z"),
        reactions: [
          {
            id: "r1",
            characterId: "mina",
            messageId: null,
            text: "도착하면 연락해!",
            meaning: "Text me when you arrive!",
            at: Date.parse("2026-11-23T03:20:00.000Z"),
          },
        ],
        seenBy: [],
        background: null,
        overlays: [],
      },
    ],
    window: null,
    kinds: ["word", "card"],
  });
  expect(myStoriesFrom(JSON.stringify({ enabled: false }))).toEqual({
    enabled: false,
    keep: true,
    stories: [],
    window: null,
    kinds: ["word", "card"],
  });
  expect(myStoriesFrom(null)).toBeNull();
  expect(myStoriesFrom("nope")).toBeNull();
  expect(myStoriesFrom(JSON.stringify([]))).toBeNull();
});

test("MS-U8. companion_post_my_story — ok면 스토리, off · daily_limit · invalid(#598) 그대로, 그 밖 failed", () => {
  expect(myStoryPostFrom(JSON.stringify({ result: "ok", story: wire }))).toMatchObject({
    result: "ok",
    story: { id: "ms-1" },
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "daily_limit", story: null }))).toEqual({
    result: "daily_limit",
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "off" }))).toEqual({ result: "off" });
  expect(myStoryPostFrom(JSON.stringify({ result: "ok", story: null }))).toEqual({
    result: "failed",
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "invalid" }))).toEqual({ result: "invalid" });
  expect(myStoryPostFrom(null)).toEqual({ result: "failed" });
});

test("MS-U9. 대화 인용 — kind mine은 그대로, deleted는 인물만으로도 선다", () => {
  expect(
    storyQuoteOf({ kind: "mine", id: "ms-1", characterId: "mina", line: "야근", imagePath: null }),
  ).toEqual({
    story: {
      storyId: "ms-1",
      characterId: "mina",
      line: "야근",
      imagePath: null,
      postedAt: null,
      kind: "mine",
    },
  });
  expect(storyQuoteOf({ kind: "deleted", characterId: "mina" })).toEqual({
    story: {
      storyId: "",
      characterId: "mina",
      line: "",
      imagePath: null,
      postedAt: null,
      kind: "deleted",
    },
  });
  expect(storyQuoteOf({ kind: "deleted" })).toEqual({});
  expect(
    storyQuoteOf({ kind: "friend", id: "s", characterId: "mina", line: "a" }).story?.kind,
  ).toBeUndefined();
});
