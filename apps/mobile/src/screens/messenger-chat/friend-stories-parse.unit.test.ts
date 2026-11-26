import { describe, expect, test } from "vitest";

import { friendStoriesFrom } from "./friend-stories-parse";

// `unit` 계층(FS-U8): `companion_friend_stories()` 응답 풀기(ADR-0178 D2).

const wire = (patch: Record<string, unknown> = {}) => ({
  id: "3a7b8c90-4d5e-4f60-b172-8d9e0f1a2b34",
  characterId: "mina",
  postedAt: "2026-11-23T03:00:00.000Z",
  expiresAt: "2026-11-24T03:00:00.000Z",
  imagePath: "content/images/u08-umbrella/post-2.webp",
  line: {
    ko: "우산 없는데",
    roman: "usan eomneunde",
    meaning: { en: "No umbrella", ja: "傘がない" },
  },
  word: { episodeId: "u08-umbrella", ref: "voca:5a317574" },
  replies: ["괜찮아요?", "조심해요!"],
  freeReply: true,
  ...patch,
});
const body = (stories: unknown) => JSON.stringify({ stories });

describe("FS-U8 응답 풀기", () => {
  test("정상 줄 — 시각은 ms, 뜻은 언어 칸 그대로", () => {
    expect(friendStoriesFrom(body([wire()]))).toEqual([
      {
        id: "3a7b8c90-4d5e-4f60-b172-8d9e0f1a2b34",
        characterId: "mina",
        postedAt: Date.parse("2026-11-23T03:00:00.000Z"),
        expiresAt: Date.parse("2026-11-24T03:00:00.000Z"),
        imagePath: "content/images/u08-umbrella/post-2.webp",
        line: {
          ko: "우산 없는데",
          roman: "usan eomneunde",
          meaning: { en: "No umbrella", ja: "傘がない" },
        },
        word: { episodeId: "u08-umbrella", ref: "voca:5a317574" },
        replies: ["괜찮아요?", "조심해요!"],
        freeReply: true,
      },
    ]);
  });

  test("단어 없음(null) · 칩 3개 넘으면 앞 3개 · 문자열 아닌 칩은 버림 · 뜻의 모르는 칸 버림", () => {
    const [only] = friendStoriesFrom(
      body([
        wire({
          word: null,
          replies: ["a", 3, "b", "c", "d"],
          line: { ko: "k", roman: "r", meaning: { en: "e", xx: "?", vi: "v" } },
        }),
      ]),
    ) ?? [null];
    expect(only?.word).toBeNull();
    expect(only?.replies).toEqual(["a", "b", "c"]);
    expect(only?.line.meaning).toEqual({ en: "e", vi: "v" });
  });

  test("칸이 빠지거나 틀린 줄은 버린다(나머지는 남김)", () => {
    const list = friendStoriesFrom(
      body([
        wire({ id: "" }),
        wire({ characterId: 3 }),
        wire({ postedAt: "not a date" }),
        wire({ line: { ko: "k", roman: "r", meaning: { ja: "only ja" } } }),
        wire({ word: { episodeId: "u01" } }),
        wire({ id: "ok" }),
      ]),
    );
    expect(list?.map((s) => s.id)).toEqual(["ok"]);
  });

  test("몸이 틀리면 null — 빈 목록은 빈 배열", () => {
    expect(friendStoriesFrom(null)).toBeNull();
    expect(friendStoriesFrom("not json")).toBeNull();
    expect(friendStoriesFrom(JSON.stringify({ nope: [] }))).toBeNull();
    expect(friendStoriesFrom(body([]))).toEqual([]);
  });

  test("freeReply가 참이 아니면 거짓", () => {
    expect(friendStoriesFrom(body([wire({ freeReply: "yes" })]))?.[0]?.freeReply).toBe(false);
  });
});
