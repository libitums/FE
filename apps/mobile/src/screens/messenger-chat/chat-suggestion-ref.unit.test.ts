import { describe, expect, test } from "vitest";

import { ideasRefOf, suggestionTagOf } from "./chat-suggestion-ref";
import { greetingFrom, historyFrom, ideasOf } from "./companion-parse";
import { applyTurnEvent, initialTurnState } from "./companion-turn";

// `unit` 계층(CS-U1 ~ U5): 칩 탭 전송의 표시(ADR-0210 D1 「앱 인계」) — 보기마다 서버 자리 · 표시 고르기 · 서버 JSON에서 읽기.

const A1 = "22222222-2222-4222-8222-222222222222";
const G1 = "55555555-5555-4555-8555-555555555555";
const U1 = "11111111-1111-4111-8111-111111111111";
const items = [
  { text: "저도요", meaning: "Me too" },
  { text: "  ", meaning: "" }, // 앱은 버리지만 서버 자리는 차지한다
  { text: "왜요?", meaning: "Why?" },
];
const ideas = ideasOf(items);

describe("ideasRefOf", () => {
  test("CS-U1 ideasOf와 같은 보기마다 서버 자리(글이 문자열인 칩 순번)를 준다", () => {
    expect(ideas?.map((idea) => idea.ko)).toEqual(["저도요", "왜요?"]);
    expect(ideasRefOf(A1, items)).toEqual({ messageId: A1, indexes: [0, 2] });
    expect(ideasRefOf(A1, [{ meaning: "x" }, { text: "네" }])).toEqual({
      messageId: A1,
      indexes: [0],
    });
  });

  test("CS-U2 메시지 id가 UUID가 아니거나 보기가 없으면 null", () => {
    expect(ideasRefOf("a-1", items)).toBeNull();
    expect(ideasRefOf(null, items)).toBeNull();
    expect(ideasRefOf(A1, null)).toBeNull();
    expect(ideasRefOf(A1, [{ text: "" }])).toBeNull();
  });
});

describe("suggestionTagOf", () => {
  const ref = ideasRefOf(A1, items);

  test("CS-U3 탭한 보기가 보낸 글 그대로면 그 칩의 메시지 · 서버 자리", () => {
    expect(suggestionTagOf({ remoteIdeas: ideas, remoteIdeasRef: ref }, 1, "왜요?")).toEqual({
      messageId: A1,
      index: 2,
    });
    expect(suggestionTagOf({ remoteIdeas: ideas, remoteIdeasRef: ref }, 0, " 저도요 ")).toEqual({
      messageId: A1,
      index: 0,
    });
  });

  test("CS-U4 보기가 아님 · 글이 다름 · 자리를 모름 · 서버 자리가 2를 넘으면 표시 없음", () => {
    expect(
      suggestionTagOf({ remoteIdeas: ideas, remoteIdeasRef: ref }, undefined, "왜요?"),
    ).toBeUndefined();
    expect(suggestionTagOf({ remoteIdeas: ideas, remoteIdeasRef: ref }, 1, "왜요")).toBeUndefined();
    expect(
      suggestionTagOf({ remoteIdeas: ideas, remoteIdeasRef: null }, 1, "왜요?"),
    ).toBeUndefined();
    expect(suggestionTagOf({ remoteIdeas: null, remoteIdeasRef: ref }, 1, "왜요?")).toBeUndefined();
    expect(
      suggestionTagOf({ remoteIdeas: ideas, remoteIdeasRef: ref }, 5, "왜요?"),
    ).toBeUndefined();
    expect(
      suggestionTagOf(
        { remoteIdeas: ideas, remoteIdeasRef: { messageId: A1, indexes: [0, 3] } },
        1,
        "왜요?",
      ),
    ).toBeUndefined();
  });
});

describe("서버 JSON", () => {
  test("CS-U5 기록 · 첫 인사 · 턴 suggestions가 보기와 함께 서버 자리를 준다", () => {
    const history = historyFrom(
      JSON.stringify({
        messages: [
          {
            id: A1,
            role: "assistant",
            origin: "turn",
            status: "complete",
            createdAt: "2026-11-27T00:00:00Z",
            segments: [{ kind: "speech", text: "안녕", translation: "" }],
            suggestions: items,
          },
        ],
      }),
    );
    expect(history?.ideasRef).toEqual({ messageId: A1, indexes: [0, 2] });

    const greeting = greetingFrom(
      JSON.stringify({
        status: "ok",
        messageId: G1,
        segments: [{ kind: "speech", text: "안녕하세요", translation: "" }],
        suggestions: { messageId: G1, status: "ok", items },
      }),
      1,
    );
    expect(greeting?.ideasRef).toEqual({ messageId: G1, indexes: [0, 2] });

    const started = applyTurnEvent(
      initialTurnState,
      "start",
      JSON.stringify({ userMessageId: U1, assistantMessageId: A1 }),
    );
    const turn = applyTurnEvent(
      started,
      "suggestions",
      JSON.stringify({ messageId: A1, status: "ok", items }),
    );
    expect(turn.ideasRef).toEqual({ messageId: A1, indexes: [0, 2] });
    // messageId가 없으면(옛 서버) 이 턴 캐릭터 메시지
    const old = applyTurnEvent(started, "suggestions", JSON.stringify({ status: "ok", items }));
    expect(old.ideasRef).toEqual({ messageId: A1, indexes: [0, 2] });
  });
});
