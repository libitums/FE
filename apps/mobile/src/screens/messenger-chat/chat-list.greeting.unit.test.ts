import { describe, expect, test } from "vitest";

import { chatRowPreview, newBadgeShown } from "./chat-list";
import type { ChatMessage, ChatRoomSummary } from "./chat-source.contract";
import { COMPANION_CHARACTERS } from "./companion-roster";

// `unit` 계층(CL-G1 ~ G5): 메시지가 아직 없는 열린 방은 그 인물의 첫 인사를 미리보기로 보이고 NEW 줄이다(ADR-0113 추가 2026-11-17).
// 첫 인사는 인물 표의 `firstLine`(정본 해금 JSON `firstMessage` 첫 줄 — 방을 열면 서버가 실제로 저장하는 말)이다.

const room = (id: string, over: Partial<ChatRoomSummary> = {}): ChatRoomSummary => ({
  roomId: id,
  counterpart: { id, name: id, avatarUrl: null },
  access: { kind: "open" },
  lastMessage: null,
  unread: 0,
  activity: "idle",
  updatedAt: 0,
  isNew: false,
  ...over,
});

const hello: ChatMessage = {
  id: "m",
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "안녕", en: "Hi" },
};

const firstLine = (id: string) => COMPANION_CHARACTERS.find((c) => c.id === id)?.firstLine ?? null;

describe("첫 인사 미리보기 (CL-G1 ~ G5)", () => {
  test("CL-G1 메시지가 없는 열린 방은 그 인물의 첫 인사다 — 덕수쌤 · 미나", () => {
    expect(chatRowPreview(room("duksu"))).toEqual({
      kind: "greeting",
      text: "안녕하세요! 덕수쌤이에요.",
    });
    expect(chatRowPreview(room("mina"))).toEqual({
      kind: "greeting",
      text: "안녕하세요! 같은 방 미나예요.",
    });
  });

  test("CL-G2 첫 인사가 없는 인물 · 메시지가 있는 방 · 활동 중인 방은 그대로다", () => {
    expect(chatRowPreview(room("clerk"))).toEqual({ kind: "empty" });
    expect(chatRowPreview(room("duksu", { lastMessage: hello }))).toEqual({
      kind: "text",
      from: "them",
      text: { ko: "안녕", en: "Hi" },
    });
    expect(chatRowPreview(room("duksu", { activity: "typing" }))).toEqual({
      kind: "activity",
      activity: "typing",
    });
  });

  test("CL-G3 고지만 있는 방(마지막이 notice)은 첫 인사가 아니라 비어 있다 — 대화가 이미 시작됐다", () => {
    const notice = { id: "n", at: 1, kind: "notice", notice: "not-available" } as ChatMessage;
    expect(chatRowPreview(room("duksu", { lastMessage: notice }))).toEqual({ kind: "empty" });
  });

  test("CL-G4 첫 인사 줄은 NEW 줄이다 — 안 읽은 수는 늘리지 않는다", () => {
    const greeting = room("duksu");
    expect(newBadgeShown(greeting)).toBe(true);
    expect(greeting.unread).toBe(0);
    expect(newBadgeShown(room("clerk"))).toBe(false);
    expect(newBadgeShown(room("duksu", { lastMessage: hello }))).toBe(false);
  });

  test("CL-G5 인물 표의 첫 인사는 아홉 모두에게 있다(추천 친구 포함)", () => {
    const ids = ["duksu", "yoonkyung", "mina", "doyun", "jaemin"];
    for (const id of [...ids, "seoyeon", "haejun", "daeun", "geonwoo"]) {
      expect(firstLine(id), id).not.toBeNull();
    }
  });
});
