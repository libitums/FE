import { describe, expect, test } from "vitest";

import type { ChatRoomSummary } from "./chat-source.contract";
import {
  guideSeenFrom,
  guideSteps,
  roomGuideSteps,
  hasNewFriend,
  messengerTabBadge,
  isSuggestedRowShown,
} from "./messenger-guide";

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
    expect(
      hasNewFriend(
        [room("mina", { isNew: true, access: { kind: "locked", unlockEpisode: 3 } })],
        "open",
      ),
    ).toBe(false);
    expect(hasNewFriend([room("duksu")], "open")).toBe(false);
  });

  test("MG-U1b 비회원 미리보기(preview)도 회원처럼 새 친구 NEW를 센다(ADR-0166)", () => {
    expect(hasNewFriend([room("duksu"), room("mina", { isNew: true })], "preview")).toBe(true);
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

describe("목록 안내와 추천 친구 줄", () => {
  test("MG-U4 목록 안내가 떠 있는 동안은 추천 줄을 세우지 않는다 — 떠 있는 덕수쌤 줄이 원본 첫 줄 자리에 맞게", () => {
    expect(isSuggestedRowShown(true)).toBe(false);
    expect(isSuggestedRowShown(false)).toBe(true);
  });
});

// 예시 스냅샷 단계(ADR-0146 추가): 서버가 제안할 때만 서고, 안내를 이미 본 사람에게는 그 단계만 따로 한 번.
test("MG-U9 방 안내의 단계 — 새 사용자는 chat · ideas (+ 제안되면 sample), 이미 본 사람은 제안되고 안 봤을 때 sample만", () => {
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: false, offered: false })).toEqual([
    "chat",
    "ideas",
  ]);
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: false, offered: true })).toEqual([
    "chat",
    "ideas",
    "sample",
  ]);
  expect(roomGuideSteps({ roomSeen: true, snapshotSeen: false, offered: true })).toEqual([
    "sample",
  ]);
  expect(roomGuideSteps({ roomSeen: true, snapshotSeen: false, offered: false })).toEqual([]);
  expect(roomGuideSteps({ roomSeen: true, snapshotSeen: true, offered: true })).toEqual([]);
  // 새 사용자가 예시 단계를 이미 본 기기(다른 계정으로 봄)면 다시 넣지 않는다.
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: true, offered: true })).toEqual([
    "chat",
    "ideas",
  ]);
});
