import { expect, test } from "vitest";

import { isSwipeUp, myStoryBarOf, myViewerItemsOf } from "./my-story-viewer";
import { MY_STORY_CHARACTER } from "./my-story-viewer.contract";
import type { ReactionFace } from "./my-stories.contract";
import { MS_HOUR, MS_NOW, myStory, reaction } from "./my-stories.test-support";

// `unit` 계층(MV-U1 ~ U6): 내 스토리 전체 화면 보기(ADR-0194 개정 ⟨보기⟩) — 보기 장 · 아래 바 자리 · 위로 밀기.

const FACES: Record<string, ReactionFace> = {
  mina: { name: "미나", avatarUrl: "https://img/mina.webp" },
  haejun: { name: "해준", avatarUrl: null },
  gunwoo: { name: "건우", avatarUrl: null },
  yun: { name: "윤경", avatarUrl: null },
};
const face = (id: string): ReactionFace | null => FACES[id] ?? null;
const seen = (...ids: string[]) => ids.map((characterId, n) => ({ characterId, at: MS_NOW - n }));

test("MV-U1. 보기 장 — 살아 있는 내 스토리만 오래된 것부터, 시작은 연 스토리, 인물 id는 나, 이름은 받은 그대로", () => {
  const old = myStory("old", { postedAt: MS_NOW - 5 * MS_HOUR });
  const mid = myStory("mid", { postedAt: MS_NOW - 3 * MS_HOUR, kind: "text", ko: "", meaning: "" });
  const gone = myStory("gone", { postedAt: MS_NOW - 30 * MS_HOUR });
  const result = myViewerItemsOf([mid, gone, old], "mid", MS_NOW, "Your story");
  expect(result?.items.map((item) => item.story.id)).toEqual(["old", "mid"]);
  expect(result?.start).toBe(1);
  const first = result?.items[0];
  expect(first?.story.characterId).toBe(MY_STORY_CHARACTER);
  expect(first?.name).toBe("Your story");
  expect(first?.unmet).toBeNull();
  expect(first?.imageUrl).toBeNull();
  expect(first?.mine).toBe(old);
  // 단어 · 카드는 한 줄 카드로(한국어 · 로마자 · 뜻), 답장 칩은 없습니다.
  expect(first?.story.line).toEqual({ ko: "야근", roman: "yageun", meaning: { en: "overtime" } });
  expect(first?.story.replies).toEqual([]);
});

test("MV-U2. 연 스토리가 목록에 없으면 null, 지난 스토리(보관함)는 그 장만 연다 — 다른 지난 것은 끼지 않는다", () => {
  const live = myStory("live");
  expect(myViewerItemsOf([live], "nope", MS_NOW, "Your story")).toBeNull();
  const gone = myStory("gone", { postedAt: MS_NOW - 30 * MS_HOUR });
  const older = myStory("older", { postedAt: MS_NOW - 40 * MS_HOUR });
  const result = myViewerItemsOf([live, gone, older], "gone", MS_NOW, "Your story");
  expect(result?.items.map((item) => item.story.id)).toEqual(["gone", "live"]);
  expect(result?.start).toBe(0);
});

test("MV-U3. 바 — 답이 있으면 방이 있는 인물의 최근 2줄(최신이 아래), Seen by 수는 서버 그대로 · 얼굴은 방 있는 인물 최대 3", () => {
  const story = myStory("s", {
    reactions: [
      reaction("r1", "mina", { at: MS_NOW - 50 * 60_000 }),
      reaction("r2", "ghost", { at: MS_NOW - 40 * 60_000 }),
      reaction("r3", "haejun", { at: MS_NOW - 5 * 60_000 }),
      reaction("r4", "gunwoo", { at: MS_NOW - 30 * 60_000 }),
    ],
    seenBy: seen("mina", "ghost", "haejun", "gunwoo", "yun"),
  });
  const bar = myStoryBarOf(story, face, true);
  expect(bar.seen).toBe(5);
  expect(bar.faces.map((who) => who.name)).toEqual(["미나", "해준", "건우"]);
  expect(bar.replies).toBe(3);
  expect(bar.note.kind).toBe("lines");
  if (bar.note.kind !== "lines") return;
  expect(bar.note.lines.map((line) => line.reaction.id)).toEqual(["r4", "r3"]);
  expect(bar.note.lines.map((line) => line.who.name)).toEqual(["건우", "해준"]);
});

test("MV-U4. 바 — 답이 없으면 한 시간 안내, 친구가 0명이면 친구 추가 안내(답이 있으면 줄이 먼저)", () => {
  const none = myStory("s", { seenBy: seen("mina") });
  expect(myStoryBarOf(none, face, true).note).toEqual({ kind: "waiting" });
  expect(myStoryBarOf(none, face, false).note).toEqual({ kind: "noFriends" });
  const empty = myStoryBarOf(myStory("e"), face, true);
  expect(empty.seen).toBe(0);
  expect(empty.faces).toEqual([]);
  expect(empty.replies).toBe(0);
  // 방이 없는 인물의 반응만 있으면 답이 없는 것과 같습니다.
  const ghost = myStory("g", { reactions: [reaction("r", "ghost")] });
  expect(myStoryBarOf(ghost, face, true).note).toEqual({ kind: "waiting" });
  const withLine = myStory("l", { reactions: [reaction("r", "mina")] });
  expect(myStoryBarOf(withLine, face, false).note.kind).toBe("lines");
});

test("MV-U7. 지난 스토리(보관함) — 답이 없으면 기다림 · 친구 안내 대신 「친구에게 24시간」, 답이 있으면 줄 그대로", () => {
  const gone = myStory("g", { postedAt: MS_NOW - 30 * MS_HOUR });
  expect(myStoryBarOf(gone, face, true, MS_NOW).note).toEqual({ kind: "hidden" });
  expect(myStoryBarOf(gone, face, false, MS_NOW).note).toEqual({ kind: "hidden" });
  const replied = myStory("r", {
    postedAt: MS_NOW - 30 * MS_HOUR,
    reactions: [reaction("x", "mina")],
  });
  expect(myStoryBarOf(replied, face, true, MS_NOW).note.kind).toBe("lines");
});

test("MV-U5. 위로 밀기 — 위로 48 이상이고 세로가 가로보다 길 때만", () => {
  expect(isSwipeUp(0, -48)).toBe(true);
  expect(isSwipeUp(10, -120)).toBe(true);
  expect(isSwipeUp(0, -47)).toBe(false);
  expect(isSwipeUp(0, 80)).toBe(false);
  expect(isSwipeUp(90, -60)).toBe(false);
  expect(isSwipeUp(-60, -60)).toBe(false);
});

test("MV-U6. 같은 시각의 답은 받은 순서를 지킨다(최신이 아래)", () => {
  const story = myStory("s", {
    reactions: [
      reaction("a", "mina", { at: MS_NOW - 60_000 }),
      reaction("b", "haejun", { at: MS_NOW - 60_000 }),
      reaction("c", "gunwoo", { at: MS_NOW - 60_000 }),
    ],
  });
  const bar = myStoryBarOf(story, face, true);
  expect(bar.note.kind === "lines" ? bar.note.lines.map((line) => line.reaction.id) : []).toEqual([
    "b",
    "c",
  ]);
});
