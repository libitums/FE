import { expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatFixtureRoom, ChatFixtureSeed } from "./chat-source.contract";

// `unit` 계층(SU-U12 ~ U15): 가짜 출처의 고지 · 위기 · 입력 막힘 · 생년(ADR-0125).

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

const room = (over: Partial<ChatFixtureRoom> = {}): ChatFixtureRoom => ({
  roomId: "r1",
  counterpart: { id: "mina", name: "Mina", avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [
    { kind: "notice", notice: "ai-disclosure", minutesAgo: 10 },
    { kind: "text", from: "them", text: { ko: "안녕", en: "Hi" }, minutesAgo: 9 },
    {
      kind: "crisis",
      resources: [{ name: "Line A", phone: "988", url: "https://a.example", hours: "24/7" }],
      minutesAgo: 1,
    },
  ],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "" },
  ideaSets: [],
  cannedReplies: [],
  photoPath: null,
  voiceLine: { durationMs: 1000, text: { ko: "네", en: "Yes" } },
  ...over,
});

const make = (seed: ChatFixtureSeed) =>
  createFixtureChatSource({
    imageUrlOf: () => null,
    seed,
    now: () => NOW,
    timers: { setTimeout: () => 0, clearTimeout: () => undefined },
  });

test("SU-U12 씨앗의 고지 · 위기 줄이 그 모양 그대로 메시지가 된다", () => {
  const source = make({ rooms: [room()] });
  const messages = source.thread("r1")?.messages ?? [];
  expect(messages[0]).toMatchObject({
    kind: "notice",
    notice: "ai-disclosure",
    at: NOW - 10 * MINUTE,
  });
  expect(messages[2]).toMatchObject({
    kind: "crisis",
    resources: [{ name: "Line A", phone: "988", url: "https://a.example", hours: "24/7" }],
  });
});

test("SU-U13 입력 막힘은 지금부터 몇 분 뒤 시각으로, 없으면 null", () => {
  const blocked = make({
    rooms: [
      room({ roomId: "a", inputBlock: { kind: "temporarily-blocked", inMinutes: 30 } }),
      room({ roomId: "b", inputBlock: { kind: "usage-time-limit", inMinutes: 90 } }),
      room({ roomId: "c", inputBlock: { kind: "age-restricted" } }),
      room({ roomId: "d" }),
    ],
  });
  expect(blocked.thread("a")?.inputBlock).toEqual({
    kind: "temporarily-blocked",
    until: NOW + 30 * MINUTE,
  });
  expect(blocked.thread("b")?.inputBlock).toEqual({
    kind: "usage-time-limit",
    resetsAt: NOW + 90 * MINUTE,
  });
  expect(blocked.thread("c")?.inputBlock).toEqual({ kind: "age-restricted" });
  expect(blocked.thread("d")?.inputBlock).toBeNull();
});

test("SU-U14 생년은 씨앗 값(없으면 unasked)에서 시작하고 setBirthYear로 set · skipped가 되며 알린다", () => {
  const source = make({ rooms: [room()] });
  expect(source.snapshot().birthYear).toEqual({ kind: "unasked" });
  const listener = vi.fn();
  source.subscribe(listener);
  source.setBirthYear(2001);
  expect(source.snapshot().birthYear).toEqual({ kind: "set", year: 2001 });
  expect(listener).toHaveBeenCalledTimes(1);
  source.setBirthYear(null);
  expect(source.snapshot().birthYear).toEqual({ kind: "skipped" });
  const seeded = make({ rooms: [room()], birthYear: { kind: "set", year: 1990 } });
  expect(seeded.snapshot().birthYear).toEqual({ kind: "set", year: 1990 });
});

test("SU-U15 같은 값이면 알리지 않고, 정수 연도가 아니면 무시한다", () => {
  const source = make({ rooms: [room()], birthYear: { kind: "set", year: 2001 } });
  const listener = vi.fn();
  source.subscribe(listener);
  source.setBirthYear(2001);
  source.setBirthYear(Number.NaN);
  source.setBirthYear(2001.5);
  expect(listener).not.toHaveBeenCalled();
  expect(source.snapshot().birthYear).toEqual({ kind: "set", year: 2001 });
});
