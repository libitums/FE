import { describe, expect, test } from "vitest";

import {
  myMessageNumberOf,
  suggestionEventOf,
  suggestionOriginOf,
  suggestionsKeyOf,
} from "./chat-suggestion-events";
import type { ChatMessage, ChatReplyIdea } from "./chat-source.contract";
import { historyFrom } from "./companion-parse";
import { newRoomState, setRemoteIdeas } from "./chat-fixture-room";
import { fixtureRoom } from "./chat-ui.test-support";

// `unit` 계층(SE-U1 ~ U5): 답할 문장 추천 이벤트의 순수 조각(ADR-0195) — 내 글 번호 구간 · 묶음 키 · 출처 해석 · 이벤트 모양,
// 서버 기록의 마지막 캐릭터 메시지 출처.

const mine = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "me",
  text: { ko: "네", en: "" },
});
const theirs = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "안녕하세요", en: "Hi" },
});
const ideas: readonly ChatReplyIdea[] = [
  { ko: "네, 좋아요", roman: "", en: "Yes" },
  { ko: "아니요", roman: "", en: "No" },
];

describe("myMessageNumberOf", () => {
  test("SE-U1 내 텍스트 글 수 + 1 — 상대 글 · 고지는 세지 않고 넷째부터 4+", () => {
    expect(myMessageNumberOf([])).toBe("1");
    expect(myMessageNumberOf([theirs("a")])).toBe("1");
    expect(myMessageNumberOf([theirs("a"), mine("b"), theirs("c")])).toBe("2");
    expect(myMessageNumberOf([mine("a"), mine("b")])).toBe("3");
    expect(myMessageNumberOf([mine("a"), mine("b"), mine("c")])).toBe("4+");
    expect(myMessageNumberOf([mine("a"), mine("b"), mine("c"), mine("d"), mine("e")])).toBe("4+");
    expect(
      myMessageNumberOf([{ id: "n", at: 1, kind: "notice", notice: "ai-disclosure" }, mine("a")]),
    ).toBe("2");
  });
});

describe("suggestionsKeyOf", () => {
  test("SE-U2 같은 글 묶음은 같은 키, 다른 묶음은 다른 키, 빈 묶음은 빈 문자열", () => {
    expect(suggestionsKeyOf(ideas)).toBe(suggestionsKeyOf(ideas.map((idea) => ({ ...idea }))));
    expect(suggestionsKeyOf(ideas)).not.toBe(suggestionsKeyOf([ideas[0] as ChatReplyIdea]));
    expect(suggestionsKeyOf(ideas)).not.toBe("");
    expect(suggestionsKeyOf([])).toBe("");
  });
});

describe("suggestionOriginOf", () => {
  test("SE-U3 greeting · turn · proactive만 출처, 그 밖(crisis · 없음 · 숫자)은 null", () => {
    expect(suggestionOriginOf("greeting")).toBe("greeting");
    expect(suggestionOriginOf("turn")).toBe("turn");
    expect(suggestionOriginOf("proactive")).toBe("proactive");
    expect(suggestionOriginOf("crisis")).toBeNull();
    expect(suggestionOriginOf(undefined)).toBeNull();
    expect(suggestionOriginOf(3)).toBeNull();
  });
});

describe("suggestionEventOf", () => {
  const room = {
    characterId: "duksu",
    ideas,
    ideasOrigin: "greeting" as const,
    messages: [theirs("a"), mine("b")],
  };

  test("SE-U4 보임 — 인물 · 보인 수 · 출처 · 내 글 번호, 추천 문장 내용은 싣지 않는다", () => {
    const event = suggestionEventOf(room);
    expect(event).toEqual({
      name: "chat_suggestion_shown",
      surface: "chat",
      characterId: "duksu",
      count: "2",
      replyOrigin: "greeting",
      myMessageNumber: "2",
    });
    expect(JSON.stringify(event)).not.toContain("좋아요");
  });

  test("SE-U4 누름 — 순번(0부터)을 더하고, 출처를 모르면 unknown", () => {
    const { ideasOrigin: _unused, ...unknownRoom } = room;
    expect(suggestionEventOf(unknownRoom, 1)).toEqual({
      name: "chat_suggestion_tapped",
      surface: "chat",
      characterId: "duksu",
      index: "1",
      count: "2",
      replyOrigin: "unknown",
      myMessageNumber: "2",
    });
  });
});

describe("historyFrom — 추천 출처", () => {
  const A1 = "22222222-2222-4222-8222-222222222222";
  const A2 = "55555555-5555-4555-8555-555555555555";
  const assistant = (id: string, origin: string, suggestions: unknown) => ({
    id,
    role: "assistant",
    origin,
    status: "complete",
    hidden: false,
    segments: [{ kind: "speech", text: "안녕!" }],
    suggestions,
    createdAt: "2026-11-12T10:00:00Z",
  });

  test("SE-U5 기록의 마지막 캐릭터 메시지 origin이 추천 출처가 된다 — 출처를 모르면 null", () => {
    // 서버 목록은 최신부터입니다.
    const page = (latestOrigin: string) =>
      JSON.stringify({
        messages: [
          assistant(A2, latestOrigin, [{ text: "네", meaning: "Yes" }]),
          assistant(A1, "greeting", [{ text: "안녕하세요", meaning: "Hello" }]),
        ],
        hasMore: false,
      });
    expect(historyFrom(page("proactive"))?.ideasOrigin).toBe("proactive");
    expect(historyFrom(page("turn"))?.ideasOrigin).toBe("turn");
    expect(historyFrom(page("crisis"))?.ideasOrigin ?? null).toBeNull();
  });
});

describe("setRemoteIdeas", () => {
  test("SE-U6 추천과 출처를 함께 바꾸고, 추천이 없거나 비면 출처도 지운다(리뷰 #590)", () => {
    const room = newRoomState(fixtureRoom("duksu"), []);
    setRemoteIdeas(room, ideas, "turn");
    expect(room.remoteIdeasOrigin).toBe("turn");
    setRemoteIdeas(room, [], "turn");
    expect(room.remoteIdeasOrigin).toBeNull();
    setRemoteIdeas(room, ideas, "greeting");
    setRemoteIdeas(room, null, "greeting");
    expect(room.remoteIdeasOrigin).toBeNull();
    setRemoteIdeas(room, ideas, undefined);
    expect(room.remoteIdeasOrigin).toBeNull();
  });
});
