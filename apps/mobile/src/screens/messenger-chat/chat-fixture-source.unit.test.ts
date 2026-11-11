import { describe, expect, test, vi } from "vitest";

import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { createFixtureChatSource } from "./chat-fixture-source";
import type {
  ChatFixtureRoom,
  ChatFixtureSeed,
  ChatMessage,
  ChatSource,
  ChatThread,
  ChatTimers,
} from "./chat-source.contract";

// `unit` 계층(MC-U19 ~ U22): 가짜 대화 출처(spec §5.1). 타이머 · 시계를 주입해 결정적으로 돌린다.

const t = CHAT_PLACEHOLDERS.timing;

type FakeTimers = ChatTimers & {
  advance(ms: number): void;
  pending(): number;
};

function fakeTimers(): FakeTimers {
  let clock = 0;
  let nextId = 1;
  const queue = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimeout(fn, ms) {
      const id = nextId++;
      queue.set(id, { at: clock + ms, fn });
      return id;
    },
    clearTimeout(handle) {
      queue.delete(handle as number);
    },
    advance(ms) {
      const target = clock + ms;
      for (;;) {
        const due = [...queue.entries()]
          .filter(([, entry]) => entry.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (due === undefined) break;
        queue.delete(due[0]);
        clock = due[1].at;
        due[1].fn();
      }
      clock = target;
    },
    pending: () => queue.size,
  };
}

const NOW = 1_800_000_000_000;

const roomSeed = (id: string, over: Partial<ChatFixtureRoom> = {}): ChatFixtureRoom => ({
  roomId: id,
  counterpart: { id, name: `이름-${id}`, avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [
    { kind: "text", from: "them", text: { ko: "안녕하세요", en: "Hello" }, minutesAgo: 5 },
  ],
  storyPoints: [
    { id: "sp-1", episodeNumber: 1, title: "First", relation: "just-met", unlocked: true },
    { id: "sp-2", episodeNumber: 2, title: "Second", relation: "getting-to-know", unlocked: true },
  ],
  settings: { autoIdeas: true, storyPointId: "sp-1" },
  ideaSets: [
    [
      { ko: "가", roman: "ga", en: "A" },
      { ko: "나", roman: "na", en: "B" },
      { ko: "다", roman: "da", en: "C" },
    ],
    [
      { ko: "라", roman: "ra", en: "D" },
      { ko: "마", roman: "ma", en: "E" },
      { ko: "바", roman: "ba", en: "F" },
    ],
    [
      { ko: "사", roman: "sa", en: "G" },
      { ko: "아", roman: "a", en: "H" },
      { ko: "자", roman: "ja", en: "I" },
    ],
  ],
  cannedReplies: [
    { ko: "반가워요", en: "Nice to meet you" },
    { ko: "네, 좋아요", en: "Yes, sure" },
  ],
  photoPath: "content/images/profiles/photo.webp",
  voiceLine: { durationMs: 4000, text: { ko: "여기요", en: "Here you go" } },
  ...over,
});

const seedOf = (...rooms: readonly ChatFixtureRoom[]): ChatFixtureSeed => ({ rooms });

function setup(seed: ChatFixtureSeed = seedOf(roomSeed("r1"), roomSeed("r2"))) {
  const timers = fakeTimers();
  const source = createFixtureChatSource({
    imageUrlOf: (path) => `url:${path}`,
    seed,
    now: () => NOW,
    timers,
  });
  return { source, timers };
}

function threadOf(source: ChatSource, roomId: string): ChatThread {
  const thread = source.thread(roomId);
  expect(thread, `thread(${roomId})`).not.toBeNull();
  return thread as ChatThread;
}

const lastOf = (source: ChatSource, roomId: string): ChatMessage => {
  const messages = threadOf(source, roomId).messages;
  expect(messages.length).toBeGreaterThan(0);
  return messages[messages.length - 1] as ChatMessage;
};
const summaryOf = (source: ChatSource, roomId: string) => {
  const found = source.snapshot().rooms.find((r) => r.roomId === roomId);
  expect(found, `summary(${roomId})`).toBeDefined();
  return found as NonNullable<typeof found>;
};

describe("씨앗과 첫 상태 (MC-U19)", () => {
  test("MC-U19. 주입한 씨앗의 방이 목록에 모두 있다 — 잔액은 출처에 없다", () => {
    const { source } = setup();
    const snapshot = source.snapshot();
    expect(snapshot.rooms.map((r) => r.roomId)).toEqual(["r1", "r2"]);
    // 잔액 키는 없다(ADR-0125가 생년을, ADR-0126이 설정을 더했다).
    expect(Object.keys(snapshot)).toEqual(["rooms", "birthYear", "preferences"]);
  });

  test("MC-U19. 씨앗의 minutesAgo 가 시계 기준 at 으로 풀린다", () => {
    const { source } = setup();
    expect(lastOf(source, "r1").at).toBe(NOW - 5 * 60_000);
    expect(summaryOf(source, "r1").updatedAt).toBe(NOW - 5 * 60_000);
  });

  test("MC-U19. 씨앗의 안 읽은 수 · 상대 · 설정이 그대로 실린다", () => {
    const { source } = setup(seedOf(roomSeed("r1", { unread: 3 })));
    expect(summaryOf(source, "r1").unread).toBe(3);
    expect(summaryOf(source, "r1").counterpart.name).toBe("이름-r1");
    expect(threadOf(source, "r1").settings).toEqual({ autoIdeas: true, storyPointId: "sp-1" });
  });
});

describe("sendText (MC-U19)", () => {
  test("MC-U19. 내 글이 즉시 덧붙고(en 은 빈 문자열) 구독자를 한 번 부른다", () => {
    const { source } = setup();
    const listener = vi.fn();
    source.subscribe(listener);
    source.sendText("r1", "  안녕  ");
    const last = lastOf(source, "r1");
    expect(last.kind).toBe("text");
    expect(last).toMatchObject({ kind: "text", from: "me", text: { ko: "안녕", en: "" } });
    expect(summaryOf(source, "r1").activity).toBe("idle");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("MC-U19. 600ms 뒤 입력 중이 켜지고 활동이 typing 이다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "안녕");
    timers.advance(t.typingDelayMs - 1);
    expect(threadOf(source, "r1").typing).toBe(false);
    timers.advance(1);
    expect(threadOf(source, "r1").typing).toBe(true);
    expect(summaryOf(source, "r1").activity).toBe("typing");
  });

  test("MC-U19. 거기서 1800ms 뒤 정해 둔 답이 오고 입력 중이 꺼지며 보기가 다음 세트로 바뀐다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "안녕");
    timers.advance(t.typingDelayMs);
    timers.advance(t.replyDelayMs - 1);
    expect(lastOf(source, "r1")).toMatchObject({ from: "me" });
    timers.advance(1);
    expect(lastOf(source, "r1")).toMatchObject({
      kind: "text",
      from: "them",
      text: { ko: "반가워요", en: "Nice to meet you" },
    });
    expect(threadOf(source, "r1").typing).toBe(false);
    expect(summaryOf(source, "r1").activity).toBe("idle");
    expect(threadOf(source, "r1").ideas).toEqual(roomSeed("r1").ideaSets[1]);
  });

  test("MC-U19. 답은 정해 둔 목록을 돌아가며 쓴다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "하나");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    source.sendText("r1", "둘");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(lastOf(source, "r1")).toMatchObject({ text: { ko: "네, 좋아요" } });
    source.sendText("r1", "셋");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(lastOf(source, "r1")).toMatchObject({ text: { ko: "반가워요" } });
  });

  test("MC-U19. 열려 있지 않은 방의 답은 안 읽은 수를 1 올린다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "안녕");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(summaryOf(source, "r1").unread).toBe(1);
  });

  test.each([[""], ["   "], ["\n"]])(
    "MC-U19. 공백 글 %j 은 무시한다 — 변화 · 구독 · 타이머 0",
    (text) => {
      const { source, timers } = setup();
      const before = threadOf(source, "r1").messages.length;
      const listener = vi.fn();
      source.subscribe(listener);
      source.sendText("r1", text);
      expect(threadOf(source, "r1").messages).toHaveLength(before);
      expect(listener).not.toHaveBeenCalled();
      expect(timers.pending()).toBe(0);
    },
  );
});

describe("requestMedia (MC-U20)", () => {
  test("MC-U20. 사진: pending 이 먼저, 활동 sending-photo, 3000ms 뒤 같은 id 가 photo 로 바뀐다", () => {
    const { source, timers } = setup();
    source.requestMedia("r1", "photo");
    const pending = lastOf(source, "r1");
    expect(pending.kind).toBe("photo-pending");
    expect(summaryOf(source, "r1").activity).toBe("sending-photo");
    timers.advance(t.photoArrivalMs - 1);
    expect(lastOf(source, "r1").kind).toBe("photo-pending");
    timers.advance(1);
    const arrived = lastOf(source, "r1");
    expect(arrived).toMatchObject({
      id: pending.id,
      kind: "photo",
      imageUrl: "url:content/images/profiles/photo.webp",
    });
    expect(threadOf(source, "r1").messages.filter((m) => m.id === pending.id)).toHaveLength(1);
    expect(summaryOf(source, "r1").activity).toBe("idle");
  });

  test("MC-U20. 사진 경로를 못 풀면(null 경로) imageUrl 이 null 이다", () => {
    const { source, timers } = setup(seedOf(roomSeed("r1", { photoPath: null })));
    source.requestMedia("r1", "photo");
    timers.advance(t.photoArrivalMs);
    expect(lastOf(source, "r1")).toMatchObject({ kind: "photo", imageUrl: null });
  });

  test("MC-U20. 사진 경로가 imageUrlOf 에서 null 을 받아도 imageUrl 이 null 이다", () => {
    const timers = fakeTimers();
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: seedOf(roomSeed("r1")),
      now: () => NOW,
      timers,
    });
    source.requestMedia("r1", "photo");
    timers.advance(t.photoArrivalMs);
    expect(lastOf(source, "r1")).toMatchObject({ kind: "photo", imageUrl: null });
  });

  test("MC-U20. 음성: voice-pending, 활동 recording-voice, 2500ms 뒤 같은 id 가 voice 로 바뀐다", () => {
    const { source, timers } = setup();
    source.requestMedia("r1", "voice");
    const pending = lastOf(source, "r1");
    expect(pending.kind).toBe("voice-pending");
    expect(summaryOf(source, "r1").activity).toBe("recording-voice");
    timers.advance(t.voiceArrivalMs - 1);
    expect(lastOf(source, "r1").kind).toBe("voice-pending");
    timers.advance(1);
    expect(lastOf(source, "r1")).toMatchObject({
      id: pending.id,
      kind: "voice",
      durationMs: 4000,
      text: { ko: "여기요", en: "Here you go" },
    });
  });

  test("MC-U20. 사진과 음성을 동시에 요청하면 각자 자기 타이머로 도착한다", () => {
    const { source, timers } = setup();
    source.requestMedia("r1", "photo");
    const photoId = lastOf(source, "r1").id;
    source.requestMedia("r1", "voice");
    const voiceId = lastOf(source, "r1").id;
    expect(voiceId).not.toBe(photoId);
    timers.advance(t.voiceArrivalMs);
    const byId = (id: string) => threadOf(source, "r1").messages.find((m) => m.id === id);
    expect(byId(voiceId)?.kind).toBe("voice");
    expect(byId(photoId)?.kind).toBe("photo-pending");
    timers.advance(t.photoArrivalMs - t.voiceArrivalMs);
    expect(byId(photoId)?.kind).toBe("photo");
  });
});

describe("방 열기 · 지우기 · 설정 (MC-U21)", () => {
  test("MC-U21. openRoom 은 안 읽은 수를 0 으로 만든다", () => {
    const { source } = setup(seedOf(roomSeed("r1", { unread: 4 })));
    source.openRoom("r1");
    expect(summaryOf(source, "r1").unread).toBe(0);
  });

  test("MC-U21. 열린 방에 온 답장은 안 읽은 수를 올리지 않는다", () => {
    const { source, timers } = setup();
    source.openRoom("r1");
    source.sendText("r1", "안녕");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(lastOf(source, "r1")).toMatchObject({ from: "them", text: { ko: "반가워요" } });
    expect(summaryOf(source, "r1").unread).toBe(0);
  });

  test("MC-U21. closeRoom 한 방에 온 답장은 안 읽음으로 쌓인다(리뷰 #1 — 나간 뒤 답이 와도 읽은 것으로 남지 않는다)", () => {
    const { source, timers } = setup();
    source.openRoom("r1");
    source.sendText("r1", "안녕");
    source.closeRoom("r1");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(summaryOf(source, "r1").unread).toBe(1);
  });

  test("MC-U21. closeRoom 은 열려 있지 않은 다른 방 닫기로는 열린 방을 닫지 않는다", () => {
    const { source, timers } = setup();
    source.openRoom("r1");
    source.closeRoom("r2");
    source.sendText("r1", "안녕");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(summaryOf(source, "r1").unread).toBe(0);
  });

  test("MC-U21. 다른 방을 열면 이전 방은 다시 안 읽음이 쌓인다", () => {
    const { source, timers } = setup();
    source.openRoom("r1");
    source.openRoom("r2");
    source.sendText("r1", "안녕");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(summaryOf(source, "r1").unread).toBe(1);
  });

  test("MC-U21. deleteRoom 은 방을 목록에서 빼고 thread 를 null 로 만들며 그 방 타이머를 푼다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "안녕");
    source.requestMedia("r1", "photo");
    expect(timers.pending()).toBeGreaterThan(0);
    source.deleteRoom("r1");
    expect(source.snapshot().rooms.map((r) => r.roomId)).toEqual(["r2"]);
    expect(source.thread("r1")).toBeNull();
    expect(timers.pending()).toBe(0);
  });

  test("MC-U21. 다른 방 타이머는 지운 방과 무관하게 남는다", () => {
    const { source, timers } = setup();
    source.sendText("r2", "안녕");
    source.deleteRoom("r1");
    timers.advance(t.typingDelayMs + t.replyDelayMs);
    expect(lastOf(source, "r2")).toMatchObject({ from: "them" });
  });

  test("MC-U21. 빈 씨앗은 방이 없다", () => {
    const { source } = setup(seedOf());
    expect(source.snapshot().rooms).toEqual([]);
    expect(source.thread("none")).toBeNull();
  });

  test("MC-U21. setAutoIdeas · setStoryPoint 가 설정에 반영된다", () => {
    const { source } = setup();
    source.setAutoIdeas("r1", false);
    expect(threadOf(source, "r1").settings.autoIdeas).toBe(false);
    source.setStoryPoint("r1", "sp-2");
    expect(threadOf(source, "r1").settings.storyPointId).toBe("sp-2");
    expect(threadOf(source, "r2").settings).toEqual({ autoIdeas: true, storyPointId: "sp-1" });
  });

  test("MC-U21. regenerateIdeas 는 길이 3 인 새 보기로 바꾼다", () => {
    const { source } = setup();
    const before = threadOf(source, "r1").ideas;
    source.regenerateIdeas("r1");
    const after = threadOf(source, "r1").ideas;
    expect(after).toHaveLength(CHAT_PLACEHOLDERS.replyIdeaCount);
    expect(after).not.toEqual(before);
  });

  test("MC-U21. report · requestFix 는 상태를 바꾸지 않는다", () => {
    const { source } = setup();
    const snapshot = source.snapshot();
    const thread = threadOf(source, "r1");
    const listener = vi.fn();
    source.subscribe(listener);
    source.report("r1", ["rude", "other"]);
    source.requestFix("r1", "어색해요");
    expect(source.snapshot()).toBe(snapshot);
    expect(threadOf(source, "r1")).toEqual(thread);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("해제 · 구독 · 참조 (MC-U22)", () => {
  test("MC-U22. dispose 뒤에는 걸린 타이머가 하나도 없다", () => {
    const { source, timers } = setup();
    source.sendText("r1", "안녕");
    source.requestMedia("r1", "photo");
    source.requestMedia("r2", "voice");
    expect(timers.pending()).toBeGreaterThan(0);
    source.dispose();
    expect(timers.pending()).toBe(0);
  });

  test("MC-U22. dispose 뒤 시간이 흘러도 구독자는 불리지 않는다", () => {
    const { source, timers } = setup();
    const listener = vi.fn();
    source.subscribe(listener);
    source.sendText("r1", "안녕");
    listener.mockClear();
    source.dispose();
    timers.advance(10_000);
    expect(listener).not.toHaveBeenCalled();
  });

  test("MC-U22. subscribe 가 돌려준 함수가 구독을 푼다", () => {
    const { source } = setup();
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);
    source.sendText("r1", "하나");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    source.sendText("r1", "둘");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("MC-U22. 상태가 같으면 snapshot 은 같은 참조다 — 바뀌면 다른 참조다", () => {
    const { source } = setup();
    const first = source.snapshot();
    expect(source.snapshot()).toBe(first);
    source.sendText("r1", "안녕");
    expect(source.snapshot()).not.toBe(first);
  });
});

describe("사진 경로 다시 풀기 (리뷰 #7)", () => {
  test("refreshImages 는 사진마다 자기 imagePath로 풀고, 일부러 null인 사진은 null로 둔다", () => {
    let ready = false;
    const imageUrlOf = (path: string): string | null => (ready ? `https://cdn/${path}` : null);
    const source = createFixtureChatSource({
      imageUrlOf,
      now: () => NOW,
      timers: fakeTimers(),
      seed: seedOf(
        roomSeed("r1", {
          photoPath: "room-photo.webp",
          messages: [
            { kind: "photo", imagePath: "own.webp", minutesAgo: 9 },
            { kind: "photo", imagePath: null, minutesAgo: 8 },
          ],
        }),
      ),
    });
    ready = true;
    source.refreshImages();
    const photos = threadOf(source, "r1").messages.filter((m) => m.kind === "photo");
    expect(photos.map((m) => (m.kind === "photo" ? m.imageUrl : "x"))).toEqual([
      "https://cdn/own.webp",
      null,
    ]);
  });

  test("도착한 사진은 방의 photoPath로 다시 풀린다", () => {
    let ready = false;
    const timers = fakeTimers();
    const source = createFixtureChatSource({
      imageUrlOf: (path) => (ready ? `https://cdn/${path}` : null),
      now: () => NOW,
      timers,
      seed: seedOf(roomSeed("r1", { photoPath: "room-photo.webp" })),
    });
    source.requestMedia("r1", "photo");
    timers.advance(t.photoArrivalMs);
    ready = true;
    source.refreshImages();
    const photo = threadOf(source, "r1").messages.find((m) => m.kind === "photo");
    expect(photo?.kind === "photo" ? photo.imageUrl : "x").toBe("https://cdn/room-photo.webp");
  });
});
