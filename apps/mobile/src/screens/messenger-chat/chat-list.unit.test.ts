import { describe, expect, test } from "vitest";

import { chatRowPreview, chatTimeOf, orderChatRooms, unreadBadge } from "./chat-list";
import type { ChatMessage, ChatRoomActivity, ChatRoomSummary } from "./chat-source.contract";

// `unit` 계층(MC-U16 ~ U18): 목록 정렬 · 미리보기 · 안 읽은 수 · 시간(spec §5.6).

const room = (id: string, over: Partial<ChatRoomSummary> = {}): ChatRoomSummary => ({
  roomId: id,
  counterpart: { id, name: id, avatarUrl: null },
  access: { kind: "open" },
  lastMessage: null,
  unread: 0,
  activity: "idle",
  updatedAt: 0,
  ...over,
});
const locked = (id: string, over: Partial<ChatRoomSummary> = {}): ChatRoomSummary =>
  room(id, { access: { kind: "locked", unlockEpisode: 4 }, ...over });

const text = (from: "me" | "them", ko: string, en: string): ChatMessage => ({
  id: "m",
  at: 1,
  kind: "text",
  from,
  text: { ko, en },
});

describe("orderChatRooms (MC-U16)", () => {
  test("MC-U16. 열린 방은 최근 것이 먼저다", () => {
    const ordered = orderChatRooms([
      room("a", { updatedAt: 10 }),
      room("b", { updatedAt: 30 }),
      room("c", { updatedAt: 20 }),
    ]);
    expect(ordered.map((r) => r.roomId)).toEqual(["b", "c", "a"]);
  });

  test("MC-U16. 잠긴 방은 맨 뒤이고 입력 순서를 지킨다 — 갱신 시각이 더 최근이어도", () => {
    const ordered = orderChatRooms([
      locked("l1", { updatedAt: 999 }),
      room("a", { updatedAt: 10 }),
      locked("l2", { updatedAt: 5 }),
      room("b", { updatedAt: 30 }),
    ]);
    expect(ordered.map((r) => r.roomId)).toEqual(["b", "a", "l1", "l2"]);
  });

  test("MC-U16. 같은 시각은 입력 순서를 지킨다(안정)", () => {
    const ordered = orderChatRooms([
      room("a", { updatedAt: 10 }),
      room("b", { updatedAt: 10 }),
      room("c", { updatedAt: 10 }),
    ]);
    expect(ordered.map((r) => r.roomId)).toEqual(["a", "b", "c"]);
  });

  test("MC-U16. 입력 배열을 바꾸지 않는다", () => {
    const input = [room("a", { updatedAt: 1 }), room("b", { updatedAt: 2 })];
    const copy = [...input];
    const ordered = orderChatRooms(input);
    expect(input).toEqual(copy);
    expect(ordered).not.toBe(input);
    expect(ordered.map((r) => r.roomId)).toEqual(["b", "a"]);
  });
});

describe("chatRowPreview (MC-U17)", () => {
  test("MC-U17. 잠김이 가장 앞선다 — 활동 · 마지막 글이 있어도", () => {
    expect(
      chatRowPreview(locked("l", { activity: "typing", lastMessage: text("them", "안녕", "Hi") })),
    ).toEqual({ kind: "locked", unlockEpisode: 4 });
  });

  test.each([["typing"], ["sending-photo"], ["recording-voice"]] as const)(
    "MC-U17. 활동 %s 가 마지막 글보다 앞선다",
    (activity: Exclude<ChatRoomActivity, "idle">) => {
      expect(
        chatRowPreview(room("a", { activity, lastMessage: text("them", "안녕", "Hi") })),
      ).toEqual({ kind: "activity", activity });
    },
  );

  test("MC-U17. 활동이 없으면 마지막 글 — 내 글 · 상대 글", () => {
    expect(chatRowPreview(room("a", { lastMessage: text("me", "네", "") }))).toEqual({
      kind: "text",
      from: "me",
      text: { ko: "네", en: "" },
    });
    expect(chatRowPreview(room("a", { lastMessage: text("them", "안녕", "Hi") }))).toEqual({
      kind: "text",
      from: "them",
      text: { ko: "안녕", en: "Hi" },
    });
  });

  test("MC-U17. 사진 · 음성", () => {
    expect(
      chatRowPreview(room("a", { lastMessage: { id: "p", at: 1, kind: "photo", imageUrl: null } })),
    ).toEqual({ kind: "photo" });
    expect(
      chatRowPreview(
        room("a", {
          lastMessage: {
            id: "v",
            at: 1,
            kind: "voice",
            durationMs: 4000,
            text: { ko: "", en: "" },
          },
        }),
      ),
    ).toEqual({ kind: "voice", durationMs: 4000 });
  });

  test("MC-U17. 보내는 중(pending) 마지막 메시지는 활동이 이긴다", () => {
    expect(
      chatRowPreview(
        room("a", {
          activity: "sending-photo",
          lastMessage: { id: "p", at: 1, kind: "photo-pending" },
        }),
      ),
    ).toEqual({ kind: "activity", activity: "sending-photo" });
  });

  test("MC-U17. 아무것도 없으면 empty 다", () => {
    expect(chatRowPreview(room("a"))).toEqual({ kind: "empty" });
  });
});

describe("unreadBadge (MC-U18)", () => {
  test.each([[0], [-1], [Number.NaN]])("MC-U18. %s 는 알약이 없다", (count) => {
    expect(unreadBadge(count)).toBeNull();
  });

  test.each([
    [1, "1"],
    [99, "99"],
    [100, "99+"],
    [1234, "99+"],
  ] as const)("MC-U18. %s → %s", (count, label) => {
    expect(unreadBadge(count)).toBe(label);
  });
});

describe("chatTimeOf (MC-U18)", () => {
  // 지역 시각으로 구성한다 — 시간대와 무관하다. 2026-11-09 는 월요일이다.
  const at = (m: number, d: number, h = 0, mi = 0, s = 0): number =>
    new Date(2026, m - 1, d, h, mi, s).getTime();
  const now = at(11, 9, 15, 30);

  test("MC-U18. 60초 안은 now 다 — 59초 전 · 방금 · 미래", () => {
    expect(chatTimeOf(now - 59_000, now)).toEqual({ kind: "now" });
    expect(chatTimeOf(now, now)).toEqual({ kind: "now" });
    expect(chatTimeOf(now + 5000, now)).toEqual({ kind: "now" });
  });

  test("MC-U18. 60초 이상이면 now 를 벗어난다", () => {
    expect(chatTimeOf(now - 60_000, now)).toEqual({ kind: "today", hours: 15, minutes: 29 });
  });

  test("MC-U18. 같은 날은 today 이고 시 · 분을 싣는다", () => {
    expect(chatTimeOf(at(11, 9, 10, 24), now)).toEqual({ kind: "today", hours: 10, minutes: 24 });
    expect(chatTimeOf(at(11, 9, 0, 0), now)).toEqual({ kind: "today", hours: 0, minutes: 0 });
  });

  test("MC-U18. 어제는 자정 경계에서 갈린다", () => {
    expect(chatTimeOf(at(11, 8, 23, 59), now)).toEqual({ kind: "yesterday" });
    expect(chatTimeOf(at(11, 8, 0, 0), now)).toEqual({ kind: "yesterday" });
  });

  test("MC-U18. 자정 직후라도 60초 안이면 날이 달라도 now 다", () => {
    const justAfterMidnight = at(11, 9, 0, 0, 30);
    expect(chatTimeOf(at(11, 8, 23, 59, 59), justAfterMidnight)).toEqual({ kind: "now" });
    expect(chatTimeOf(at(11, 8, 23, 58), justAfterMidnight)).toEqual({ kind: "yesterday" });
  });

  test("MC-U18. 2~6일 전은 요일이다(일 0 … 토 6)", () => {
    expect(chatTimeOf(at(11, 7, 12), now)).toEqual({ kind: "weekday", weekday: 6 }); // 토
    expect(chatTimeOf(at(11, 3, 12), now)).toEqual({ kind: "weekday", weekday: 2 }); // 화
  });

  test("MC-U18. 7일 전부터는 날짜(월 · 일)다", () => {
    expect(chatTimeOf(at(11, 2, 12), now)).toEqual({ kind: "date", month: 11, day: 2 });
    expect(chatTimeOf(at(1, 5, 12), now)).toEqual({ kind: "date", month: 1, day: 5 });
  });
});
