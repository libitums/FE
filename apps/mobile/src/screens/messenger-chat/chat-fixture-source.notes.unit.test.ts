import { describe, expect, test, vi } from "vitest";

import { fakeTimers } from "./chat-fixture-timers.test-support";
import { createFixtureChatSource } from "./chat-fixture-source";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  NO_NOTES,
  notesOf,
  type ChatFixtureCorrection,
  type ChatFixtureMeaning,
  type ChatFixtureRoom,
  type ChatFixtureSeed,
  type ChatSource,
  type ChatThread,
} from "./chat-source.contract";

// `unit` 계층(MC2-U18 · U19): 가짜 출처의 내 글 노트 — 교정 열기 · 뜻 요청 · 답장 도착 때 교정 생김
// (messenger-chat-1-5 spec §5.1). 타이머 · 시계를 주입해 결정적으로 돌린다.

const t = CHAT_PLACEHOLDERS.timing;
const NOW = 1_800_000_000_000;

const FIX: ChatFixtureCorrection = {
  original: "저 주말에 카페 갔어요.",
  corrected: "저는 주말에 카페에 갔어요.",
  changes: [
    { start: 1, end: 2 },
    { start: 9, end: 10 },
  ],
  kind: "correction",
  items: [{ original: "저", corrected: "저는", reason: "Add 는 after 저 and 에 after 카페." }],
  better: null,
  meaning: null,
};
const ARRIVAL_FIX: ChatFixtureCorrection = {
  original: "어제 영화 봤어요.",
  corrected: "어제 영화를 봤어요.",
  changes: [{ start: 6, end: 7 }],
  kind: "correction",
  items: [{ original: "저", corrected: "저는", reason: "Add 를 after the object." }],
  better: null,
  meaning: null,
};
const MEANINGS: readonly ChatFixtureMeaning[] = [
  { ko: "카페에 갔어요.", romanization: "kape-e gasseoyo.", meaning: "I went to a cafe." },
  {
    ko: "저 주말에 카페 갔어요.",
    romanization: "jeo jumare kape gasseoyo.",
    meaning: "I went to a cafe on the weekend.",
  },
];
const FALLBACK = { romanization: "…", meaning: "Meaning coming soon" };

const roomSeed = (over: Partial<ChatFixtureRoom> = {}): ChatFixtureRoom => ({
  roomId: "r1",
  counterpart: { id: "r1", name: "미나", avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [
    { kind: "text", from: "them", text: { ko: "안녕하세요", en: "Hello" }, minutesAgo: 9 },
    {
      kind: "text",
      from: "me",
      text: { ko: FIX.original, en: "" },
      minutesAgo: 8,
      correction: FIX,
    },
    { kind: "text", from: "me", text: { ko: "카페에 갔어요. ", en: "" }, minutesAgo: 7 },
    { kind: "text", from: "me", text: { ko: "표에 없는 말", en: "" }, minutesAgo: 6 },
  ],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "sp-1" },
  ideaSets: [[{ ko: "네", roman: "ne", en: "Yes" }]],
  cannedReplies: [{ ko: "좋아요!", en: "Sounds good!" }],
  photoPath: null,
  voiceLine: { durationMs: 4000, text: { ko: "여기요", en: "Here" } },
  ...over,
});

const seedOf = (rooms: readonly ChatFixtureRoom[] = [roomSeed()]): ChatFixtureSeed => ({
  rooms,
  meanings: MEANINGS,
  corrections: [FIX, ARRIVAL_FIX],
  fallbackMeaning: FALLBACK,
});

function setup(seed: ChatFixtureSeed = seedOf()) {
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: (path) => `url:${path}`,
    seed,
    now: () => NOW,
    timers,
  });
  return { source, timers };
}

function threadOf(source: ChatSource, roomId = "r1"): ChatThread {
  const thread = source.thread(roomId);
  expect(thread, `thread(${roomId})`).not.toBeNull();
  return thread as ChatThread;
}

/** 시드 순서: 0 상대 · 1 교정 있는 내 글 · 2 표에 있는 내 글 · 3 표에 없는 내 글. */
const idAt = (source: ChatSource, index: number, roomId = "r1"): string => {
  const message = threadOf(source, roomId).messages[index];
  expect(message, `message ${index}`).toBeDefined();
  return (message as { id: string }).id;
};
const notes = (source: ChatSource, id: string, roomId = "r1") =>
  notesOf(threadOf(source, roomId), id);

describe("씨앗 교정과 openCorrection (MC2-U18)", () => {
  test("MC2-U18. 교정이 붙은 씨앗 내 글은 available · 아직 안 봄 · detail idle 이다", () => {
    const { source } = setup();
    expect(notes(source, idAt(source, 1)).correction).toEqual({
      kind: "available",
      seen: false,
      detail: { status: "idle" },
    });
  });

  test("MC2-U18. 교정이 없는 내 글 · 상대 글은 노트가 없다(NO_NOTES)", () => {
    const { source } = setup();
    for (const index of [0, 2, 3]) {
      expect(notes(source, idAt(source, index))).toEqual(NO_NOTES);
    }
    expect(notesOf(threadOf(source), "없는-id")).toBe(NO_NOTES);
  });

  test("MC2-U18. openCorrection: seen 은 즉시 true 가 되고 detail 은 loading 이다", () => {
    const { source } = setup();
    const id = idAt(source, 1);
    source.openCorrection("r1", id);
    expect(notes(source, id).correction).toEqual({
      kind: "available",
      seen: true,
      detail: { status: "loading" },
    });
  });

  test("MC2-U18. 800 ms 뒤 ready 가 되고 값은 씨앗 교정이다(799 ms 에는 아직 loading)", () => {
    const { source, timers } = setup();
    const id = idAt(source, 1);
    source.openCorrection("r1", id);
    timers.advance(t.correctionMs - 1);
    expect(notes(source, id).correction).toMatchObject({ detail: { status: "loading" } });
    timers.advance(1);
    const correction = notes(source, id).correction;
    expect(correction).toMatchObject({ kind: "available", seen: true });
    if (correction.kind !== "available" || correction.detail.status !== "ready") {
      throw new Error("detail 이 ready 가 아니다");
    }
    expect(correction.detail.value).toMatchObject({
      corrected: FIX.corrected,
      changes: FIX.changes,
      kind: FIX.kind,
      items: FIX.items,
      better: FIX.better,
      meaning: FIX.meaning,
    });
  });

  test("MC2-U18. 주입한 correctionMs 는 800 이다", () => {
    expect(t.correctionMs).toBe(800);
  });

  test("MC2-U18. 이미 ready 인 교정을 다시 부르면 아무것도 바뀌지 않는다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 1);
    source.openCorrection("r1", id);
    timers.advance(t.correctionMs);
    expect(notes(source, id).correction).toMatchObject({ detail: { status: "ready" } });
    const before = threadOf(source);
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    source.openCorrection("r1", id);
    expect(listener).not.toHaveBeenCalled();
    expect(threadOf(source)).toBe(before);
    expect(timers.pending()).toBe(0);
  });

  test("MC2-U18. 불러오는 중에 다시 부르면 타이머가 하나뿐이다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 1);
    source.openCorrection("r1", id);
    source.openCorrection("r1", id);
    expect(timers.pending()).toBe(1);
  });

  test("MC2-U18. 구독자는 seen+loading 에서 한 번, ready 에서 한 번 알림을 받는다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 1);
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    source.openCorrection("r1", id);
    expect(listener).toHaveBeenCalledTimes(1);
    timers.advance(t.correctionMs);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("MC2-U18. 상대 글 · 교정 없는 내 글 · 없는 id 는 무동작이다(던지지 않고 알림 · 타이머 없음)", () => {
    const { source, timers } = setup();
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    for (const id of [idAt(source, 0), idAt(source, 2), "fx-없음"]) {
      expect(() => source.openCorrection("r1", id)).not.toThrow();
      expect(notes(source, id)).toEqual(NO_NOTES);
    }
    expect(listener).not.toHaveBeenCalled();
    expect(timers.pending()).toBe(0);
  });

  test("MC2-U18. 없는 방 · 지운 방은 무동작이다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 1);
    expect(() => source.openCorrection("없는-방", id)).not.toThrow();
    source.deleteRoom("r1");
    expect(() => source.openCorrection("r1", id)).not.toThrow();
    expect(timers.pending()).toBe(0);
  });

  test("MC2-U18. 교정을 열어도 같은 방의 다른 글 노트는 그대로다", () => {
    const { source } = setup();
    source.openCorrection("r1", idAt(source, 1));
    expect(notes(source, idAt(source, 2))).toEqual(NO_NOTES);
  });

  test("MC2-U18. 불러오는 중에 방을 지우면 걸린 타이머가 해제된다", () => {
    const { source, timers } = setup();
    source.openCorrection("r1", idAt(source, 1));
    expect(timers.pending()).toBe(1);
    source.deleteRoom("r1");
    expect(timers.pending()).toBe(0);
  });
});

describe("requestMeaning (MC2-U19)", () => {
  test("MC2-U19. idle → loading 이고, 700 ms 뒤 표와 일치하는 뜻이 ready 가 된다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 2); // 「카페에 갔어요. 」 — 끝 공백은 ko.trim() 으로 맞춘다
    expect(notes(source, id).meaning).toEqual({ status: "idle" });
    source.requestMeaning("r1", id);
    expect(notes(source, id).meaning).toEqual({ status: "loading" });
    timers.advance(t.meaningMs - 1);
    expect(notes(source, id).meaning).toEqual({ status: "loading" });
    timers.advance(1);
    expect(notes(source, id).meaning).toEqual({
      status: "ready",
      value: { romanization: "kape-e gasseoyo.", meaning: "I went to a cafe." },
    });
  });

  test("MC2-U19. 주입한 meaningMs 는 700 이다", () => {
    expect(t.meaningMs).toBe(700);
  });

  test("MC2-U19. 표에 없는 글은 fallbackMeaning 이 ready 가 된다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 3);
    source.requestMeaning("r1", id);
    timers.advance(t.meaningMs);
    expect(notes(source, id).meaning).toEqual({ status: "ready", value: FALLBACK });
  });

  test("MC2-U19. 두 번 불러도 타이머는 하나이고, ready 뒤에는 무변화다", () => {
    const { source, timers } = setup();
    const id = idAt(source, 2);
    source.requestMeaning("r1", id);
    source.requestMeaning("r1", id);
    expect(timers.pending()).toBe(1);
    timers.advance(t.meaningMs);
    expect(notes(source, id).meaning).toMatchObject({ status: "ready" });
    const before = threadOf(source);
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    source.requestMeaning("r1", id);
    expect(listener).not.toHaveBeenCalled();
    expect(threadOf(source)).toBe(before);
    expect(timers.pending()).toBe(0);
  });

  test("MC2-U19. 상대 글 · 없는 id · 없는 방은 무동작이다", () => {
    const { source, timers } = setup();
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    expect(() => source.requestMeaning("r1", idAt(source, 0))).not.toThrow();
    expect(() => source.requestMeaning("r1", "fx-없음")).not.toThrow();
    expect(() => source.requestMeaning("없는-방", idAt(source, 2))).not.toThrow();
    expect(notes(source, idAt(source, 0))).toEqual(NO_NOTES);
    expect(listener).not.toHaveBeenCalled();
    expect(timers.pending()).toBe(0);
  });

  test("MC2-U19. 구독자는 loading 에서 한 번, ready 에서 한 번 알림을 받는다", () => {
    const { source, timers } = setup();
    const listener = vi.fn<() => void>();
    source.subscribe(listener);
    source.requestMeaning("r1", idAt(source, 2));
    expect(listener).toHaveBeenCalledTimes(1);
    timers.advance(t.meaningMs);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("MC2-U19. dispose 하면 걸린 노트 타이머가 0 이다", () => {
    const { source, timers } = setup();
    source.requestMeaning("r1", idAt(source, 2));
    source.openCorrection("r1", idAt(source, 1));
    expect(timers.pending()).toBe(2);
    source.dispose();
    expect(timers.pending()).toBe(0);
  });
});

describe("새로 보낸 글과 답장 도착 (MC2-U19)", () => {
  test("MC2-U19. 새로 보낸 글에는 notes 키가 없다(NO_NOTES)", () => {
    const { source } = setup();
    source.sendText("r1", "새로 보낸 말");
    const thread = threadOf(source);
    const sent = thread.messages[thread.messages.length - 1];
    expect(sent).toMatchObject({ kind: "text", from: "me" });
    const id = (sent as { id: string }).id;
    expect(id in thread.notes).toBe(false);
    expect(notesOf(thread, id)).toEqual(NO_NOTES);
  });

  test("MC2-U19. 새로 보낸 글의 뜻은 요청하면 받을 수 있다(아이콘 줄은 뜻만)", () => {
    const { source, timers } = setup();
    source.sendText("r1", "카페에 갔어요.");
    const thread = threadOf(source);
    const id = (thread.messages[thread.messages.length - 1] as { id: string }).id;
    source.requestMeaning("r1", id);
    timers.advance(t.meaningMs);
    expect(notes(source, id).meaning).toMatchObject({ status: "ready" });
  });

  test("MC2-U19. 답장이 도착할 때 직전 내 글이 교정 표의 original 과 같으면 교정이 생긴다", () => {
    const { source, timers } = setup();
    source.sendText("r1", ARRIVAL_FIX.original);
    const thread = threadOf(source);
    const id = (thread.messages[thread.messages.length - 1] as { id: string }).id;
    expect(notes(source, id).correction).toEqual({ kind: "none" });
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(notes(source, id).correction).toEqual({
      kind: "available",
      seen: false,
      detail: { status: "idle" },
    });
  });

  test("MC2-U19. 교정 표와 맞지 않는 글은 답장이 와도 교정이 없다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "표에 없는 새 말");
    const thread = threadOf(source);
    const id = (thread.messages[thread.messages.length - 1] as { id: string }).id;
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(notes(source, id).correction).toEqual({ kind: "none" });
  });
});
