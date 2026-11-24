import { describe, expect, test } from "vitest";

import type { ChatRoomSummary } from "./chat-source.contract";
import {
  finishedRoomPart,
  keyboardGuideNext,
  keyboardGuidePhoneHidden,
  keyboardOfStage,
  guideSeenFrom,
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
test("MG-U9 방 안내의 단계 — 새 사용자는 keyboard · ideas (+ 제안되면 sample), 이미 본 사람은 제안되고 안 봤을 때 sample만", () => {
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: false, offered: false })).toEqual([
    "keyboard",
    "ideas",
  ]);
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: false, offered: true })).toEqual([
    "keyboard",
    "ideas",
    "sample",
  ]);
  const kb = { keyboardSeen: true };
  expect(roomGuideSteps({ roomSeen: true, snapshotSeen: false, offered: true, ...kb })).toEqual([
    "sample",
  ]);
  expect(roomGuideSteps({ roomSeen: true, snapshotSeen: false, offered: false, ...kb })).toEqual(
    [],
  );
  expect(roomGuideSteps({ roomSeen: true, snapshotSeen: true, offered: true, ...kb })).toEqual([]);
  // 새 사용자가 예시 단계를 이미 본 기기(다른 계정으로 봄)면 다시 넣지 않는다.
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: true, offered: true })).toEqual([
    "keyboard",
    "ideas",
  ]);
});

test("MG-U10 예시 음성 단계 — 스냅샷 다음에 붙고, 사진 · 음성은 따로 제안 · 따로 봄", () => {
  const both = { offered: true, voiceOffered: true };
  expect(
    roomGuideSteps({ roomSeen: false, snapshotSeen: false, voiceSeen: false, ...both }),
  ).toEqual(["keyboard", "ideas", "sample", "voice"]);
  expect(
    roomGuideSteps({ roomSeen: true, snapshotSeen: false, voiceSeen: false, ...both }),
  ).toEqual(["keyboard", "sample", "voice"]);
  // 사진은 이미 봤고 음성만 남았으면 음성만.
  expect(
    roomGuideSteps({
      roomSeen: true,
      snapshotSeen: true,
      voiceSeen: false,
      keyboardSeen: true,
      ...both,
    }),
  ).toEqual(["voice"]);
  // 음성을 써 본 계정(서버가 제안하지 않음)에는 사진만.
  expect(
    roomGuideSteps({
      roomSeen: true,
      snapshotSeen: false,
      voiceSeen: false,
      keyboardSeen: true,
      offered: true,
      voiceOffered: false,
    }),
  ).toEqual(["sample"]);
  expect(
    roomGuideSteps({
      roomSeen: true,
      snapshotSeen: true,
      voiceSeen: true,
      keyboardSeen: true,
      ...both,
    }),
  ).toEqual([]);
  expect(guideSeenFrom('["voice","room"]')).toEqual(["voice", "room"]);
});

// 키보드 두 갈래 단계(ADR-0190): 교정 안내(chat) 자리에 맨 앞으로, 안내를 이미 본 사람에게도 이 단계만 한 번.
test("MG-U11 키보드 단계 — 새 사용자는 맨 앞, 이미 본 사람은 키보드만(+ 예시), 본 기록 · 토글 없음이면 빠짐", () => {
  const base = { snapshotSeen: true, offered: false };
  expect(roomGuideSteps({ roomSeen: false, ...base })).toEqual(["keyboard", "ideas"]);
  expect(roomGuideSteps({ roomSeen: true, ...base })).toEqual(["keyboard"]);
  expect(roomGuideSteps({ roomSeen: true, ...base, keyboardSeen: true })).toEqual([]);
  // 키보드만 보고 앱을 닫은 새 사용자 — 다음에는 전구부터.
  expect(roomGuideSteps({ roomSeen: false, ...base, keyboardSeen: true })).toEqual(["ideas"]);
  // 한국어 자판이 있어 토글이 서지 않는 방이면 가리킬 곳이 없어 빠집니다.
  expect(roomGuideSteps({ roomSeen: false, ...base, toggle: false })).toEqual(["ideas"]);
  expect(roomGuideSteps({ roomSeen: true, ...base, toggle: false })).toEqual([]);
  // 교정 안내(chat) 단계는 더 없습니다.
  expect(roomGuideSteps({ roomSeen: false, snapshotSeen: false, offered: true })).not.toContain(
    "chat",
  );
});

test("MG-U12 키보드 단계 안 — 휴대폰 키보드 → Hangul keys → 끝, 화면마다 세울 키보드", () => {
  expect(keyboardGuideNext("phone")).toBe("hangul");
  expect(keyboardGuideNext("hangul")).toBe("done");
  expect(keyboardOfStage("phone")).toBe("phone");
  expect(keyboardOfStage("hangul")).toBe("learning");
});

test("MG-U15 휴대폰 키보드 화면에서 올라왔던 키보드가 내려가면(높이 0) Hangul keys로 — 다른 화면 · 오르기 전 · 양수 높이는 그대로", () => {
  expect(keyboardGuidePhoneHidden({ stage: "phone", height: 0, risen: true })).toBe(true);
  expect(keyboardGuidePhoneHidden({ stage: "hangul", height: 0, risen: true })).toBe(false);
  expect(keyboardGuidePhoneHidden({ stage: "phone", height: 0, risen: false })).toBe(false);
  expect(keyboardGuidePhoneHidden({ stage: "phone", height: 300, risen: true })).toBe(false);
});

test("MG-U13 끝낸 안내의 part — 새 사용자 room, 이미 본 사람은 키보드가 있으면 keyboard, 아니면 snapshot", () => {
  expect(finishedRoomPart({ roomSeen: false, steps: ["keyboard", "ideas"] })).toBe("room");
  expect(finishedRoomPart({ roomSeen: true, steps: ["keyboard"] })).toBe("keyboard");
  expect(finishedRoomPart({ roomSeen: true, steps: ["keyboard", "sample"] })).toBe("keyboard");
  expect(finishedRoomPart({ roomSeen: true, steps: ["sample", "voice"] })).toBe("snapshot");
});
