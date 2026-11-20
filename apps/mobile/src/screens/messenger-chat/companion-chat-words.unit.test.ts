import { describe, expect, test } from "vitest";

import { NO_NOTES } from "./chat-source.contract";
import { chatWordsOf, withChatWords } from "./companion-chat-words";
import { historyFrom } from "./companion-parse";
import { applyTurnEvent, initialTurnState } from "./companion-turn";

// `unit` 계층(ADR-0170 CW-U1 ~ U3): 서버 교정 카드의 채팅 단어 해석 · 노트 · 턴 · 기록.

const U1 = "11111111-1111-4111-8111-111111111111";
const words = {
  counted: [
    { id: "voca:kimchi-stew", surface: "김치찌개" },
    { id: "voca:tasty", surface: "맛있다" },
  ],
  pending: [{ id: "voca:spicy", surface: "맵다" }],
  weekTotal: 14,
};
const result = {
  counted: [
    { id: "voca:kimchi-stew", surface: "김치찌개" },
    { id: "voca:tasty", surface: "맛있다" },
  ],
  pending: [{ id: "voca:spicy", surface: "맵다" }],
  weekTotal: 14,
};

describe("chatWordsOf", () => {
  test("CW-U1. 카드의 chatWords를 풀고, 틀린 칸은 버리며, 둘 다 비거나 없으면 null", () => {
    expect(chatWordsOf({ status: "none", chatWords: words })).toEqual(result);
    expect(
      chatWordsOf({
        chatWords: {
          counted: [{ id: "voca:a", surface: "" }, { id: 3 }, { id: "voca:b", surface: "비" }],
          pending: "x",
          weekTotal: 2,
        },
      }),
    ).toEqual({ counted: [{ id: "voca:b", surface: "비" }], pending: [], weekTotal: 2 });
    expect(chatWordsOf({ chatWords: { counted: [], pending: [], weekTotal: 3 } })).toBeNull();
    expect(chatWordsOf({ chatWords: { ...words, weekTotal: -1 } })).toBeNull();
    expect(chatWordsOf({ status: "ok" })).toBeNull();
    expect(chatWordsOf(null)).toBeNull();
  });

  test("CW-U2. 노트에 붙인다 — 뜻 · 교정은 그대로, 없던 글은 NO_NOTES 위에", () => {
    const notes = withChatWords({}, U1, result);
    expect(notes[U1]).toEqual({ ...NO_NOTES, chatWords: result });
    const kept = withChatWords(
      { [U1]: { ...NO_NOTES, meaning: { status: "loading" } } },
      U1,
      result,
    );
    expect(kept[U1]?.meaning).toEqual({ status: "loading" });
    expect(kept[U1]?.chatWords).toEqual(result);
  });
});

describe("턴 · 기록", () => {
  test("CW-U3. correction 이벤트의 chatWords는 카드가 none이어도 턴 상태에, 기록은 내 글 id로", () => {
    const turn = applyTurnEvent(
      initialTurnState,
      "correction",
      JSON.stringify({
        userMessageId: U1,
        status: "none",
        kind: null,
        original: "김치찌개 먹었어요",
        corrected: null,
        items: [],
        better: null,
        meaning: null,
        chatWords: words,
      }),
    );
    expect(turn.correction).toBeNull();
    expect(turn.chatWords).toEqual({ userMessageId: U1, result });

    const history = historyFrom(
      JSON.stringify({
        messages: [
          {
            id: U1,
            role: "user",
            origin: "turn",
            status: "complete",
            hidden: false,
            text: "김치찌개 먹었어요",
            inputMode: "text",
            segments: [],
            notice: null,
            feedback: { status: "none", items: [], chatWords: words },
            createdAt: "2026-11-12T10:00:01.000Z",
          },
        ],
        hasMore: false,
      }),
    );
    expect(history?.chatWords?.[U1]).toEqual(result);
  });
});
