import { describe, expect, test, vi } from "vitest";

import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import type { ChatFixtureRoom } from "../screens/messenger-chat/chat-source.contract";
import { companionPushActions, companionRoomFor } from "./companion-push";
import { navReducer } from "./nav-reducer";
import { entryInitialNav, initialNav } from "./nav-state";

// `unit` 계층(CP-U4 ~ U6): 선톡 푸시를 누른 뒤의 이동(ADR-0127).

const room = (id: string, over: Partial<ChatFixtureRoom> = {}): ChatFixtureRoom => ({
  roomId: `room-${id}`,
  counterpart: { id, name: id, avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "" },
  ideaSets: [],
  cannedReplies: [],
  photoPath: null,
  voiceLine: { durationMs: 1000, text: { ko: "네", en: "Yes" } },
  ...over,
});

const makeSource = () =>
  createFixtureChatSource({
    imageUrlOf: () => null,
    seed: {
      rooms: [
        room("mina"),
        room("clerk", { access: { kind: "locked", unlockEpisode: 4 } }),
        room("owner", { inputBlock: { kind: "age-restricted" } }),
        room("guide", { inputBlock: { kind: "temporarily-blocked", inMinutes: 10 } }),
        room("minor", {
          access: { kind: "locked", unlockEpisode: 4 },
          inputBlock: { kind: "age-restricted" },
        }),
      ],
      birthYear: { kind: "set", year: 2000 },
    },
    now: () => 1_800_000_000_000,
    timers: { setTimeout: () => 0, clearTimeout: () => undefined },
  });
const source = makeSource();

describe("companionRoomFor", () => {
  test("CP-U4 열린 방은 그 방 id(상대 id로 찾는다), 일시 차단도 연다(방 안 상태 줄이 알린다)", () => {
    expect(companionRoomFor(source, "mina")).toBe("room-mina");
    expect(companionRoomFor(source, "guide")).toBe("room-guide");
  });

  test("CP-U5 없음 · 잠김 · 연령 제한이면 null", () => {
    expect(companionRoomFor(source, "nobody")).toBeNull();
    expect(companionRoomFor(source, "clerk")).toBeNull();
    expect(companionRoomFor(source, "owner")).toBeNull();
  });
});

test("CP-U6 이동 — 메신저 탭 루트 → 방, 열 수 없으면 메신저 루트에만 안내를 붙인다", () => {
  expect(companionPushActions(source, "mina", true)).toEqual([
    { type: "switchTab", tab: "messenger" },
    { type: "backToRoot" },
    { type: "push", screen: { name: "messenger-chat", roomId: "room-mina" } },
  ]);
  expect(companionPushActions(source, "nobody", true)).toEqual([
    { type: "switchTab", tab: "messenger" },
    { type: "backToRoot" },
    { type: "setListNotice", notice: "chat-unavailable" },
  ]);
});

test("CP-U9 잠긴 방이면 열고 들어간다 — 서버에 대화가 있어 온 선톡이다(재설치 · 새 기기). 해금 기록도 남긴다", () => {
  const fresh = makeSource();
  const restored = vi.fn();
  expect(companionPushActions(fresh, "clerk", true, restored)).toEqual([
    { type: "switchTab", tab: "messenger" },
    { type: "backToRoot" },
    { type: "push", screen: { name: "messenger-chat", roomId: "room-clerk" } },
  ]);
  expect(restored).toHaveBeenCalledWith("clerk");
  expect(fresh.snapshot().rooms.find((each) => each.roomId === "room-clerk")?.access.kind).toBe(
    "open",
  );
});

test("CP-U10 이미 열린 방 · 없는 인물 · 메신저를 못 쓰는 계정은 해금 기록을 건드리지 않는다", () => {
  const fresh = makeSource();
  const restored = vi.fn();
  companionPushActions(fresh, "mina", true, restored);
  companionPushActions(fresh, "nobody", true, restored);
  companionPushActions(fresh, "clerk", false, restored);
  // 연령 제한으로 막힌 잠긴 방은 열지 않고 안내로 끝난다.
  expect(companionPushActions(fresh, "minor", true, restored).slice(-1)[0]).toEqual({
    type: "setListNotice",
    notice: "chat-unavailable",
  });
  expect(fresh.snapshot().rooms.find((each) => each.roomId === "room-minor")?.access.kind).toBe(
    "locked",
  );
  expect(restored).not.toHaveBeenCalled();
  expect(companionRoomFor(fresh, "clerk")).toBeNull();
});

test("CP-U7 setListNotice는 메신저 루트만 바꾼다 — 활성 탭 · 진입 구간 · 위에 쌓인 화면은 그대로(리뷰 W2)", () => {
  const onJourney = navReducer(initialNav, { type: "setListNotice", notice: "chat-unavailable" });
  expect(onJourney.tab).toBe("journey");
  expect(onJourney.stacks.journey).toEqual(initialNav.stacks.journey);
  expect(onJourney.stacks.messenger).toEqual([
    { name: "messenger-list", notice: "chat-unavailable" },
  ]);

  const withRoom = navReducer(
    {
      ...onJourney,
      tab: "messenger",
      stacks: {
        ...onJourney.stacks,
        messenger: [...onJourney.stacks.messenger, { name: "messenger-chat", roomId: "r" }],
      },
    },
    { type: "setListNotice", notice: null },
  );
  expect(withRoom.stacks.messenger).toEqual([
    { name: "messenger-list" },
    { name: "messenger-chat", roomId: "r" },
  ]);

  const entry = navReducer(entryInitialNav, { type: "setListNotice", notice: "chat-unavailable" });
  expect(entry.entry).toEqual(entryInitialNav.entry);
  expect(navReducer(initialNav, { type: "setListNotice", notice: null })).toBe(initialNav);
});

test("CP-U8 메신저를 쓸 수 없는 계정이면 메신저 탭 루트에서 멈춘다 — 방도 안내도 없다(ADR-0128 리뷰 W1)", () => {
  expect(companionPushActions(source, "mina", false)).toEqual([
    { type: "switchTab", tab: "messenger" },
    { type: "backToRoot" },
  ]);
});
