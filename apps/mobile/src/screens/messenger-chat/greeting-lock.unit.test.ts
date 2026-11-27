import { describe, expect, test } from "vitest";

import type { ChatMessage } from "./chat-source.contract";
import { greetingLocked, type GreetingLockInput } from "./greeting-lock";

// `unit` 계층(GL-U1 ~ U4, ADR-0139 개정 2026-11-27): 덕수쌤 안내의 첫 인사를 기다리는 동안만 보내기를 잠근다.

const hello: ChatMessage = {
  id: "g#0",
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "안녕하세요!", en: "Hi!" },
};
const mine: ChatMessage = { id: "u", at: 2, kind: "text", from: "me", text: { ko: "네", en: "" } };

const server = (history: "loading" | "loaded" | "failed") => ({
  history,
  unsent: [],
  recovery: "none" as const,
});

const input = (over: Partial<GreetingLockInput> = {}): GreetingLockInput => ({
  guideRoom: true,
  roomUnseen: true,
  expired: false,
  thread: { typing: false, messages: [], server: server("loading") },
  ...over,
});

describe("첫 인사 잠금", () => {
  test("GL-U1 안내를 안 본 덕수쌤 방에서 기록을 읽는 중 · 첫 인사를 받는 중이면 잠근다", () => {
    expect(greetingLocked(input())).toBe(true);
    expect(
      greetingLocked(input({ thread: { typing: true, messages: [], server: server("loaded") } })),
    ).toBe(true);
    // 인사 전에 낸 내 글이 로그에 있어도 인사가 아직이면 잠근다.
    expect(
      greetingLocked(
        input({ thread: { typing: true, messages: [mine], server: server("loaded") } }),
      ),
    ).toBe(true);
  });

  test("GL-U2 첫 인사가 서면 푼다", () => {
    expect(
      greetingLocked(
        input({ thread: { typing: false, messages: [hello], server: server("loaded") } }),
      ),
    ).toBe(false);
    // 기록에 이미 인사가 있으면 읽는 중이어도 잠그지 않는다.
    expect(
      greetingLocked(
        input({ thread: { typing: false, messages: [hello], server: server("loading") } }),
      ),
    ).toBe(false);
  });

  test("GL-U3 못 받으면 푼다 — 기록 실패 · 인사 없음 · 상한 시간", () => {
    expect(
      greetingLocked(input({ thread: { typing: false, messages: [], server: server("failed") } })),
    ).toBe(false);
    expect(
      greetingLocked(input({ thread: { typing: false, messages: [], server: server("loaded") } })),
    ).toBe(false);
    expect(greetingLocked(input({ expired: true }))).toBe(false);
  });

  test("GL-U4 다른 방 · 안내를 본 사람 · 가짜 출처 · 방 없음은 잠그지 않는다", () => {
    expect(greetingLocked(input({ guideRoom: false }))).toBe(false);
    expect(greetingLocked(input({ roomUnseen: false }))).toBe(false);
    expect(greetingLocked(input({ thread: { typing: true, messages: [], server: null } }))).toBe(
      false,
    );
    expect(greetingLocked(input({ thread: null }))).toBe(false);
  });
});
