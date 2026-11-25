import { expect, test } from "vitest";

import {
  archiveOf,
  dayOf,
  draftOf,
  mineRingOf,
  myQuoteOf,
  unseenReactionIdsOf,
} from "./my-stories";
import type { MyStory, MyStoryChoice } from "./my-stories.contract";

// `unit` 계층(MS-U1 ~ U6): 내 스토리 판정(ADR-0194) — 「Your story」 고리 · 보관함 · 날짜 · 올리기 요청 · 인용 · 카드 거르기.

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

const story = (id: string, hoursAgo: number, reactions: string[] = []): MyStory => ({
  id,
  kind: "word",
  word: { episodeId: "u01", ref: `voca:${id}` },
  ko: "야근",
  roman: "yageun",
  meaning: "overtime",
  example: null,
  postedAt: NOW - hoursAgo * HOUR,
  expiresAt: NOW - hoursAgo * HOUR + 24 * HOUR,
  reactions: reactions.map((rid, n) => ({
    id: rid,
    characterId: n === 0 ? "mina" : "haejun",
    messageId: null,
    text: "야근 끝나면 라면 먹어!",
    meaning: null,
    at: NOW - HOUR,
  })),
  seenBy: [],
  background: null,
  overlays: [],
});

test("MS-U1. 「Your story」 — 꺼져 있으면 null, 살아 있는 가장 새 스토리 · 안 본 반응이 있으면 unseen", () => {
  expect(mineRingOf(null, new Set(), NOW)).toBeNull();
  expect(
    mineRingOf(
      {
        enabled: false,
        keep: true,
        stories: [story("a", 1)],
        window: null,
        kinds: ["word", "card"],
      },
      new Set(),
      NOW,
    ),
  ).toBeNull();
  expect(
    mineRingOf(
      { enabled: true, keep: true, stories: [], window: null, kinds: ["word", "card"] },
      new Set(),
      NOW,
    ),
  ).toEqual({
    live: null,
    unseen: false,
  });
  const state = {
    enabled: true,
    keep: true,
    stories: [story("b", 2, ["r1", "r2"]), story("a", 30)],
    window: null,
    kinds: ["word", "card"] as const,
  };
  expect(mineRingOf(state, new Set(), NOW)).toEqual({ live: state.stories[0], unseen: true });
  expect(mineRingOf(state, new Set(["r1", "r2"]), NOW)?.unseen).toBe(false);
  expect(unseenReactionIdsOf(state.stories[0]!, new Set(["r1"]))).toEqual(["r2"]);
  // 24시간 지난 것만 있으면 살아 있는 것이 없다.
  expect(mineRingOf({ ...state, stories: [story("a", 30, ["r9"])] }, new Set(), NOW)).toEqual({
    live: null,
    unseen: false,
  });
});

test("MS-U2. 보관함 — 최신 먼저, 보관을 끄면 살아 있는 것만", () => {
  const stories = [story("old", 50), story("new", 1), story("mid", 26)];
  expect(
    archiveOf(
      { enabled: true, keep: true, stories, window: null, kinds: ["word", "card"] },
      NOW,
    ).map((s) => s.id),
  ).toEqual(["new", "mid", "old"]);
  expect(
    archiveOf(
      { enabled: true, keep: false, stories, window: null, kinds: ["word", "card"] },
      NOW,
    ).map((s) => s.id),
  ).toEqual(["new"]);
});

test("MS-U3. 날짜 — 오늘(현지)이면 today, 아니면 월 · 일", () => {
  const local = new Date(NOW);
  const today = new Date(local.getFullYear(), local.getMonth(), local.getDate(), 1).getTime();
  expect(dayOf(today, NOW)).toEqual({ kind: "today" });
  const before = new Date(local.getFullYear(), local.getMonth(), local.getDate() - 3, 9).getTime();
  const d = new Date(before);
  expect(dayOf(before, NOW)).toEqual({ kind: "date", month: d.getMonth() + 1, day: d.getDate() });
});

const choice = (key: string): MyStoryChoice => ({
  key,
  kind: "word",
  word: { episodeId: "u02", ref: `voca:${key}` },
  ko: "도착하다",
  roman: "dochakada",
  meaning: "to arrive",
  example: { ko: "서울에 도착했어!", meaning: "I arrived in Seoul!" },
  source: "Lesson 2",
});

test("MS-U4. 올리기 요청 — 고른 거리 그대로 + clientId · 화면 언어", () => {
  expect(draftOf(choice("k1"), "cid-1", "ja", -300)).toEqual({
    clientId: "cid-1",
    kind: "word",
    word: { episodeId: "u02", ref: "voca:k1" },
    ko: "도착하다",
    roman: "dochakada",
    meaning: "to arrive",
    example: { ko: "서울에 도착했어!", meaning: "I arrived in Seoul!" },
    lang: "ja",
    tzOffsetMin: -300,
  });
});

test("MS-U5. 대화 인용 — 내 스토리(kind mine, 그림 없음)", () => {
  expect(myQuoteOf(story("s1", 2), "mina")).toEqual({
    storyId: "s1",
    characterId: "mina",
    line: "야근",
    imagePath: null,
    postedAt: NOW - 2 * HOUR,
    kind: "mine",
  });
});
