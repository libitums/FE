import { describe, expect, test } from "vitest";

import type { ChatRoomSummary } from "./chat-source.contract";
import { guideSeenFrom, guideSteps, hasNewFriend, messengerTabBadge } from "./messenger-guide";

// `unit` 계층(MG-U1 ~ U3): 메신저 첫 입장 안내 판정(사용자 결정 2026-11-13).

const room = (id: string, over: Partial<ChatRoomSummary> = {}): ChatRoomSummary => ({
  roomId: id,
  counterpart: { id, name: id, avatarUrl: null },
  access: { kind: "open" },
  lastMessage: null,
  unread: 0,
  updatedAt: 0,
  activity: "idle",
  isNew: false,
  ...over,
});

describe("하단 탭 NEW", () => {
  test("MG-U1 처음(메신저 탭에 안 들어감) 또는 안 연 새 친구가 있으면 NEW", () => {
    expect(messengerTabBadge({ visited: false, newFriend: false })).toBe("new");
    expect(messengerTabBadge({ visited: true, newFriend: true })).toBe("new");
    expect(messengerTabBadge({ visited: true, newFriend: false })).toBeNull();
  });

  test("MG-U1 새 친구는 열 수 있는 계정의 열린 방 가운데 isNew만 — 잠긴 방 · 손님은 아님", () => {
    const rooms = [room("duksu"), room("mina", { isNew: true })];
    expect(hasNewFriend(rooms, "open")).toBe(true);
    expect(hasNewFriend(rooms, "sign-in")).toBe(false);
    expect(hasNewFriend(rooms, "coming-soon")).toBe(false);
    expect(
      hasNewFriend(
        [room("mina", { isNew: true, access: { kind: "locked", unlockEpisode: 3 } })],
        "open",
      ),
    ).toBe(false);
    expect(hasNewFriend([room("duksu")], "open")).toBe(false);
  });
});

describe("코치마크 단계 · 기록", () => {
  test("MG-U2 사진 · 음성이 서버에 이어지기 전에는 그 단계를 건너뛴다", () => {
    expect(guideSteps({ mediaReady: false })).toEqual(["chat", "ideas"]);
    expect(guideSteps({ mediaReady: true })).toEqual(["chat", "ideas", "media"]);
  });

  test("MG-U3 본 안내 기록 읽기 — 없거나 깨졌으면 빈 기록, 모르는 값은 버림", () => {
    expect(guideSeenFrom(null)).toEqual([]);
    expect(guideSeenFrom("not json")).toEqual([]);
    expect(guideSeenFrom(JSON.stringify(["list", "room", "list", "x"]))).toEqual(["list", "room"]);
    expect(guideSeenFrom(JSON.stringify({ list: true }))).toEqual([]);
  });
});
