import { expect, test } from "vitest";

import type { ChatMessage, ChatRoomSummary } from "./chat-source.contract";
import { myStoriesFrom, myStoryPostFrom } from "./my-stories-parse";
import { draftOf, hasFriendsOf, nextOpenOf, tzOffsetMinOf, windowSheetOf } from "./my-stories";
import type { MyStoryWindow } from "./my-stories.contract";
import { myStory, wordChoice } from "./my-stories.test-support";
import { quizFreeOf } from "./story-quiz";

// `unit` 계층(MS-U13 ~ U19): 서버 #588 계약(ADR-0194 · ADR-0191) 반영 — 창 · Seen by · 반응 메시지 id · 사진/확인 중 건너뛰기 ·
// 친구 0명 · 덕수쌤 퀴즈(서버 반영 예상) 판정. 순수.

const story = (patch: Record<string, unknown> = {}) => ({
  id: "ms-1",
  kind: "word",
  word: { episodeId: "u01", ref: "voca:yageun" },
  ko: "야근",
  roman: "yageun",
  meaning: "overtime",
  example: null,
  postedAt: "2026-11-25T03:00:00.000Z",
  expiresAt: "2026-11-26T03:00:00.000Z",
  reactions: [],
  ...patch,
});
const wireWindow = {
  slot: "day",
  day: "2026-11-25",
  nextAt: "2026-11-25T09:00:00.000Z",
  used: true,
};

test("MS-U13. 읽기 — 반응의 messageId · seenBy · 창을 풀고, 사진(photo)은 경로가 버킷 꼴이 아니면 건너뛰고 확인 중(checking) 줄은 읽는다(ADR-0199)", () => {
  const state = myStoriesFrom(
    JSON.stringify({
      enabled: true,
      keep: true,
      window: wireWindow,
      stories: [
        story({
          reactions: [
            {
              id: "r1",
              characterId: "yoonkyung",
              messageId: "m-1",
              text: "야근 끝나면 라면 먹어!",
              meaning: "Have ramen after overtime!",
              at: "2026-11-25T03:03:00.000Z",
            },
            {
              id: "r2",
              characterId: "haejun",
              text: "오늘도 야근해?",
              meaning: null,
              at: "2026-11-25T03:30:00.000Z",
            },
          ],
          seenBy: [
            { characterId: "yoonkyung", at: "2026-11-25T03:02:00.000Z" },
            { characterId: "", at: "2026-11-25T03:02:00.000Z" },
            { characterId: "mina", at: "nope" },
          ],
        }),
        story({ id: "photo-1", kind: "photo", word: null, imagePath: "u/p.jpg" }),
        story({ id: "check-1", status: "checking" }),
        story({ id: "live-1", status: "live" }),
      ],
    }),
  );
  expect(state?.window).toEqual({
    slot: "day",
    day: "2026-11-25",
    nextAt: Date.parse("2026-11-25T09:00:00.000Z"),
    used: true,
  });
  expect(state?.stories.map((s) => s.id)).toEqual(["ms-1", "check-1", "live-1"]);
  expect(state?.stories[1]?.status).toBe("checking");
  const [first] = state?.stories ?? [];
  expect(first?.reactions.map((r) => r.messageId)).toEqual(["m-1", null]);
  expect(first?.seenBy).toEqual([
    { characterId: "yoonkyung", at: Date.parse("2026-11-25T03:02:00.000Z") },
  ]);
  expect(state?.stories[1]?.seenBy).toEqual([]);
  // 옛 서버(창 · seenBy 없음) · 틀린 창은 null
  expect(myStoriesFrom(JSON.stringify({ enabled: true, stories: [] }))?.window).toBeNull();
  expect(
    myStoriesFrom(JSON.stringify({ enabled: true, stories: [], window: { slot: "noon" } }))?.window,
  ).toBeNull();
});

test("MS-U14. 올리기 결과 — ok는 창과 함께, window_used는 창과 함께, daily_limit · off · invalid(#598) 그대로, 모르는 결과는 failed", () => {
  expect(
    myStoryPostFrom(JSON.stringify({ result: "ok", story: story(), window: wireWindow })),
  ).toMatchObject({ result: "ok", story: { id: "ms-1" }, window: { slot: "day", used: true } });
  expect(myStoryPostFrom(JSON.stringify({ result: "ok", story: story() }))).toMatchObject({
    result: "ok",
    window: null,
  });
  expect(
    myStoryPostFrom(JSON.stringify({ result: "window_used", story: null, window: wireWindow })),
  ).toEqual({
    result: "window_used",
    window: {
      slot: "day",
      day: "2026-11-25",
      nextAt: Date.parse("2026-11-25T09:00:00.000Z"),
      used: true,
    },
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "window_used" }))).toEqual({
    result: "window_used",
    window: null,
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "daily_limit", window: wireWindow }))).toEqual({
    result: "daily_limit",
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "invalid" }))).toEqual({ result: "invalid" });
  expect(myStoryPostFrom(JSON.stringify({ result: "check_limit" }))).toEqual({
    result: "check_limit",
  });
});

test("MS-U15. 기기 UTC 차이 — 동쪽이 +(getTimezoneOffset의 반대), 올리기 요청에 실린다", () => {
  const now = Date.UTC(2026, 10, 25, 3, 0);
  expect(tzOffsetMinOf(now)).toBe(-new Date(now).getTimezoneOffset() || 0);
  expect(draftOf(wordChoice("a"), "cid", "en", 540)).toMatchObject({
    clientId: "cid",
    lang: "en",
    tzOffsetMin: 540,
  });
});

const localWindow = (slot: MyStoryWindow["slot"], used: boolean, nextAt: number) => ({
  slot,
  day: "2026-11-25",
  nextAt,
  used,
});
const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

test("MS-U16. 「+」 자리 — 이번 창을 썼고 다음 창이 아직이면 그 시각, 안 썼거나 지났거나 창이 없으면 null", () => {
  const next = local(25, 18);
  expect(nextOpenOf(localWindow("day", true, next), local(25, 15))).toBe(next);
  expect(nextOpenOf(localWindow("day", false, next), local(25, 15))).toBeNull();
  expect(nextOpenOf(localWindow("day", true, next), local(25, 18, 1))).toBeNull();
  expect(nextOpenOf(null, local(25, 15))).toBeNull();
});

test("MS-U17. 창 시트 — 지난 칸은 올렸으면 shared · 아니면 missed, 지금 칸은 썼으면 shared, 다음 칸은 upcoming, 다음 시각은 기기 현지", () => {
  const afternoon = windowSheetOf(
    localWindow("day", true, local(25, 18)),
    [myStory("s-day", { postedAt: local(25, 13) })],
    local(25, 15),
  );
  expect(afternoon).toEqual({
    current: "day",
    used: true,
    next: { hours: 18, minutes: 0 },
    slots: [
      { slot: "morning", state: "missed", startHour: 4, endHour: 12 },
      { slot: "day", state: "shared", startHour: 12, endHour: 18 },
      { slot: "night", state: "upcoming", startHour: 18, endHour: 4 },
    ],
  });
  // 아침에 올렸고 지금(밤 · 새벽 1시)은 아직 안 씀 — 밤 칸의 날은 전날
  const night = windowSheetOf(
    localWindow("night", false, local(26, 4)),
    [myStory("s-morning", { postedAt: local(25, 9) }), myStory("old", { postedAt: local(24, 9) })],
    local(26, 1),
  );
  expect(night.slots.map((s) => s.state)).toEqual(["shared", "missed", "open"]);
  expect(night.next).toEqual({ hours: 4, minutes: 0 });
});

const room = (id: string, lastMessage: ChatMessage | null, open = true): ChatRoomSummary => ({
  roomId: id,
  counterpart: { id, name: id, avatarUrl: null },
  access: open ? { kind: "open" } : { kind: "locked", unlockEpisode: 3 },
  lastMessage,
  unread: 0,
  activity: "idle",
  updatedAt: 0,
  isNew: false,
});
const text = (id: string, from: "me" | "them", extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({ id, at: 0, kind: "text", from, text: { ko: id, en: "" }, ...extra }) as ChatMessage;

test("MS-U18. 친구 0명 — 열린 방 중 대화가 있는 방이 하나도 없으면 false(잠긴 방 · 빈 방은 세지 않음)", () => {
  expect(hasFriendsOf([])).toBe(false);
  expect(hasFriendsOf([room("a", null), room("b", text("x", "me"), false)])).toBe(false);
  expect(hasFriendsOf([room("a", null), room("c", text("y", "them"))])).toBe(true);
});

test("MS-U19. 퀴즈 무료 — 퀴즈 반응 뒤 첫 답 · 힌트 뒤 둘째 답만 무료, 판정 대기 · 맞힘 · 정답 공개 · 보통 글 뒤에는 없음", () => {
  const ask = text("m1#0", "them", { quiz: { kind: "ask" } });
  expect(quizFreeOf([])).toBeNull();
  expect(quizFreeOf([text("a", "them")])).toBeNull();
  expect(quizFreeOf([ask])).toEqual({ attempt: 1 });
  const answer = (id: string, attempt: 1 | 2, result: "correct" | "hint" | "revealed" | null) =>
    text(id, "me", { quiz: { kind: "answer", attempt, result } });
  expect(quizFreeOf([ask, answer("u1", 1, null)])).toBeNull();
  expect(quizFreeOf([ask, answer("u1", 1, "hint")])).toEqual({ attempt: 2 });
  expect(quizFreeOf([ask, answer("u1", 1, "hint"), text("m2#0", "them")])).toEqual({
    attempt: 2,
  });
  expect(quizFreeOf([ask, answer("u1", 1, "hint"), answer("u2", 2, "revealed")])).toBeNull();
  expect(quizFreeOf([ask, answer("u1", 1, "correct")])).toBeNull();
  expect(quizFreeOf([ask, text("u1", "me")])).toBeNull();
  // 새 퀴즈 반응이 오면 다시 무료
  expect(quizFreeOf([ask, answer("u1", 1, "correct"), { ...ask, id: "m9#0" }])).toEqual({
    attempt: 1,
  });
});
