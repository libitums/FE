import { describe, expect, test, vi } from "vitest";

import {
  chatRoomReducer,
  focusOriginOf,
  initialChatRoomState,
  overlayParent,
} from "./chat-room-state";
import { createFixtureChatSource } from "./chat-fixture-source";
import {
  CHARACTER_MEMORY_CAP,
  MEMORY_MAX_LENGTH,
  normalizeMemoryText,
  PROACTIVE_HOURS,
  SHARED_MEMORY_CAP,
} from "./chat-settings-rules";
import type { ChatFixtureRoom, ChatFixtureSeed } from "./chat-source.contract";

// `unit` 계층(CS-U1 ~ U12): 대화 설정(ADR-0126) — 규칙 · 리듀서 · 가짜 출처의 설정과 기억.

const room = (id: string): ChatFixtureRoom => ({
  roomId: id,
  counterpart: { id, name: id, avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "" },
  ideaSets: [[{ ko: "네", roman: "ne", en: "Yes" }]],
  cannedReplies: [],
  photoPath: null,
  voiceLine: { durationMs: 1000, text: { ko: "네", en: "Yes" } },
});

const make = (over: Partial<ChatFixtureSeed> = {}) =>
  createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { rooms: [room("mina")], ...over },
    now: () => 1_800_000_000_000,
    timers: { setTimeout: () => 0, clearTimeout: () => undefined },
  });

describe("규칙", () => {
  test("CS-U1 시각은 아무 때나 · 9 · 12 · 18 · 21, 상한은 공유 30 · 인물 50 · 글 500자", () => {
    expect(PROACTIVE_HOURS).toEqual([null, 9, 12, 18, 21]);
    expect(SHARED_MEMORY_CAP).toBe(30);
    expect(CHARACTER_MEMORY_CAP).toBe(50);
    expect(MEMORY_MAX_LENGTH).toBe(500);
  });

  test("CS-U2 기억 글은 앞뒤 공백을 걷고 1~500자만 받는다", () => {
    expect(normalizeMemoryText("  You like coffee.  ")).toBe("You like coffee.");
    expect(normalizeMemoryText("   ")).toBeNull();
    expect(normalizeMemoryText("a".repeat(500))).toBe("a".repeat(500));
    expect(normalizeMemoryText("a".repeat(501))).toBeNull();
  });
});

describe("교정 방식 시트 리듀서", () => {
  const initial = initialChatRoomState({ initial: "learning", toggle: "shown" });
  test("CS-U3 고르면 시트가 열렸을 때만 바뀌고, 닫으면 사이드바로 · 초점은 사이드바 줄로", () => {
    const open = chatRoomReducer(initial, {
      type: "open-overlay",
      overlay: { kind: "feedback-mode", selected: "separate" },
    });
    expect(
      chatRoomReducer(open, { type: "select-feedback-mode", mode: "natural" }).overlay,
    ).toEqual({
      kind: "feedback-mode",
      selected: "natural",
    });
    expect(chatRoomReducer(initial, { type: "select-feedback-mode", mode: "natural" })).toBe(
      initial,
    );
    expect(overlayParent({ kind: "feedback-mode", selected: "prefix" })).toEqual({
      kind: "sidebar",
    });
    expect(focusOriginOf({ kind: "feedback-mode", selected: "prefix" })).toBe(
      "sidebar-feedback-mode",
    );
  });
});

describe("가짜 출처 — 설정", () => {
  test("CS-U4 기본 설정은 추천 답변 켬 · 하루 한 번 · 아무 때나 · 카드만", () => {
    expect(make().snapshot().preferences).toEqual({
      replyIdeas: true,
      proactive: "daily1",
      proactiveHour: null,
      feedbackMode: "separate",
    });
  });

  test("CS-U5 setPreferences는 바뀐 칸만 바꾸고 알리며, 같은 값이면 알리지 않는다", () => {
    const source = make();
    const listener = vi.fn();
    source.subscribe(listener);
    source.setPreferences({ proactive: "daily2", proactiveHour: 21 });
    expect(source.snapshot().preferences).toMatchObject({ proactive: "daily2", proactiveHour: 21 });
    expect(listener).toHaveBeenCalledTimes(1);
    source.setPreferences({ proactive: "daily2" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("CS-U6 틀린 값(시각 24 · 모르는 빈도)은 받지 않는다", () => {
    const source = make();
    source.setPreferences({ proactiveHour: 24 });
    source.setPreferences({ proactive: "weekly" as never });
    expect(source.snapshot().preferences).toMatchObject({
      proactive: "daily1",
      proactiveHour: null,
    });
  });

  test("CS-U7 추천 답변을 끄면 모든 방의 보기가 비고, 켜면 돌아온다", () => {
    const source = make();
    expect(source.thread("mina")?.ideas).toHaveLength(1);
    source.setPreferences({ replyIdeas: false });
    expect(source.thread("mina")?.ideas).toEqual([]);
    source.setPreferences({ replyIdeas: true });
    expect(source.thread("mina")?.ideas).toHaveLength(1);
  });
});

describe("가짜 출처 — 기억", () => {
  const seeded = () =>
    make({
      memories: {
        shared: ["You're from Manila."],
        byCharacter: { mina: ["You like iced americano.", "Your test is on Dec 14."] },
      },
    });

  test("CS-U8 층마다 씨앗 기억 · 개수 · 상한 · full", () => {
    const source = seeded();
    const shared = source.memories({ kind: "shared" });
    expect(shared.memories.map((m) => m.content)).toEqual(["You're from Manila."]);
    expect(shared).toMatchObject({ count: 1, cap: 30, full: false });
    const mina = source.memories({ kind: "character", characterId: "mina" });
    expect(mina).toMatchObject({ count: 2, cap: 50, full: false });
    expect(source.memories({ kind: "character", characterId: "nobody" })).toMatchObject({
      memories: [],
      count: 0,
      cap: 50,
    });
  });

  test("CS-U9 같은 상태면 같은 참조", () => {
    const source = seeded();
    expect(source.memories({ kind: "shared" })).toBe(source.memories({ kind: "shared" }));
  });

  test("CS-U10 고치면 글이 바뀌고 edited가 되며 알린다, 빈 글은 무동작", () => {
    const source = seeded();
    const listener = vi.fn();
    source.subscribe(listener);
    const id = source.memories({ kind: "shared" }).memories[0]?.id ?? "";
    source.updateMemory(id, "  You're from Cebu.  ");
    expect(source.memories({ kind: "shared" }).memories[0]).toMatchObject({
      content: "You're from Cebu.",
      edited: true,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    source.updateMemory(id, "   ");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("CS-U11 지우면 그 층에서 빠지고 개수가 준다", () => {
    const source = seeded();
    const first = source.memories({ kind: "character", characterId: "mina" }).memories[0];
    source.deleteMemory(first?.id ?? "");
    const after = source.memories({ kind: "character", characterId: "mina" });
    expect(after.count).toBe(1);
    expect(after.memories.map((m) => m.content)).toEqual(["Your test is on Dec 14."]);
  });

  test("CS-U12 상한에 닿으면 full", () => {
    const source = make({
      memories: {
        shared: Array.from({ length: 30 }, (_, i) => `fact ${i}`),
        byCharacter: {},
      },
    });
    expect(source.memories({ kind: "shared" })).toMatchObject({ count: 30, full: true });
  });

  test("CS-U13 같은 글로 고치면 무동작 — edited가 붙지 않고 알리지 않는다", () => {
    const source = seeded();
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    const memory = source.memories({ kind: "shared" }).memories[0];
    source.updateMemory(memory?.id ?? "", `  ${memory?.content ?? ""} `);
    expect(source.memories({ kind: "shared" }).memories[0]?.edited).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });
});
