import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatFixtureRoom, ChatMessage, ChatTimers } from "./chat-source.contract";

// `unit` 계층(기기 결함 D5 · D6, device-findings-1): 기기에서 보낸 뒤 입력 칸이 비지 않고 입력 중 · 답이 오지 않았다.
// 원인: 기본 타이머가 `globalThis.setTimeout`을 불렀다. Lynx 배경 스레드는 `setTimeout`을 맨 식별자로 주입할 뿐
// `globalThis`의 속성으로 두지 않는다(레포 선례: lib/posthog-client.ts 「globalThis.fetch · globalThis.lynx 둘 다
// undefined」). 그래서 `sendText`가 내 줄을 넣고 알린 뒤 타이머를 걸다가 던졌고, 호출한 `send`가 입력 비우기 전에 끊겼다.
// 테스트 환경(Node)에서는 `globalThis.setTimeout`이 있어 이 환경 차이를 값으로 재현할 수 없으므로, 아래 첫 테스트는
// 소스 문자열 점검이고 나머지는 「타이머가 던져도 출처가 던지지 않는다」는 계약(spec §5.1 「어떤 호출도 던지지 않습니다」)이다.

const read = (relative: string): string => {
  const path = resolve(process.cwd(), relative);
  return existsSync(path)
    ? readFileSync(path, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
    : "";
};

const imageUrlOf = (path: string): string => `https://cdn/${path}`;

const room: ChatFixtureRoom = {
  roomId: "mina",
  counterpart: { id: "mina", name: "미나", avatarPath: null },
  access: { kind: "open" },
  unread: 0,
  messages: [{ kind: "text", from: "them", text: { ko: "안녕", en: "Hi" }, minutesAgo: 5 }],
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "sp-1" },
  ideaSets: [[{ ko: "네", roman: "ne", en: "Yes" }]],
  cannedReplies: [{ ko: "좋아요!", en: "Sounds good!" }],
  photoPath: "content/images/photo-a.webp",
  voiceLine: { durationMs: 4000, text: { ko: "안녕하세요", en: "Hello" } },
};

const throwingTimers: ChatTimers = {
  setTimeout: () => {
    throw new TypeError("globalThis.setTimeout is not a function");
  },
  clearTimeout: () => undefined,
};

function sourceWith(timers: ChatTimers) {
  return createFixtureChatSource({
    imageUrlOf,
    seed: { rooms: [room] },
    now: () => 1_000_000,
    timers,
  });
}

test("D6. 기본 타이머는 globalThis가 아니라 맨 식별자 setTimeout · clearTimeout을 쓴다(Lynx 배경 스레드)", () => {
  const source = read("src/screens/messenger-chat/chat-fixture-room.ts");

  expect(source).toContain("defaultTimers");
  expect(source).not.toMatch(/globalThis\s*\.\s*(set|clear)Timeout/);
});

test("D6. 타이머를 걸 수 없어도 sendText는 던지지 않고 내 줄은 남는다", () => {
  const source = sourceWith(throwingTimers);

  expect(() => source.sendText("mina", "안녕하세요")).not.toThrow();

  const messages: readonly ChatMessage[] = source.thread("mina")?.messages ?? [];
  expect(messages.some((message) => message.kind === "text" && message.from === "me")).toBe(true);
});

test("D6. 타이머를 걸 수 없어도 requestMedia · 구독 알림은 던지지 않는다", () => {
  const source = sourceWith(throwingTimers);
  let notified = 0;
  source.subscribe(() => {
    notified += 1;
  });

  expect(() => source.requestMedia("mina", "photo")).not.toThrow();

  expect(notified).toBeGreaterThan(0);
});
