import { describe, expect, test } from "vitest";

import { applyTurnEvent, endTurn, initialTurnState, type TurnState } from "./companion-turn";

// `unit` 계층(ST-U1 ~ U6): 턴 하나의 SSE 이벤트 접기(ADR-0137).

const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";

const run = (events: readonly (readonly [string, unknown])[], from: TurnState = initialTurnState) =>
  events.reduce(
    (state, [name, data]) =>
      applyTurnEvent(state, name, typeof data === "string" ? data : JSON.stringify(data)),
    from,
  );

const start = [
  "start",
  {
    contractVersion: 1,
    conversationId: A1,
    userMessageId: U1,
    assistantMessageId: A1,
    speechLevel: "polite",
  },
] as const;

describe("턴 리듀서", () => {
  test("ST-U1 start → delta 누적 → translation → done", () => {
    const state = run([
      start,
      ["delta", { segment: 0, kind: "speech", text: "안녕" }],
      ["delta", { segment: 0, kind: "speech", text: "하세요!" }],
      ["delta", { segment: 1, kind: "action", text: "웃는다" }],
      ["translation", { segment: 0, text: "Hello!" }],
      ["done", { assistantMessageId: A1, creditsSpent: 1, balance: null }],
    ]);
    expect(state.userMessageId).toBe(U1);
    expect(state.assistantMessageId).toBe(A1);
    expect(state.bubbles).toEqual([
      { ko: "안녕하세요!", en: "Hello!" },
      { ko: "*웃는다*", en: "" },
    ]);
    expect(state.finished).toBe(true);
    expect(state.failure).toBeNull();
  });

  test("ST-U2 correction(ok) · suggestions · notice · crisis", () => {
    const state = run([
      start,
      ["notice", { kind: "ai_disclosure" }],
      [
        "correction",
        {
          userMessageId: U1,
          status: "ok",
          kind: "better",
          original: "커피를 좋아합니다",
          corrected: "커피 좋아해요",
          items: [],
          better: null,
          meaning: "I like coffee.",
        },
      ],
      [
        "suggestions",
        { messageId: A1, status: "ok", items: [{ text: "네", meaning: "Yes", intent: "reflect" }] },
      ],
      ["crisis", { resources: [{ name: "Line", phone: "109" }], region: "KR" }],
    ]);
    expect(state.notices).toEqual(["ai-disclosure"]);
    expect(state.correction?.userMessageId).toBe(U1);
    expect(state.correction?.card.kind).toBe("better");
    expect(state.ideas).toEqual([{ ko: "네", roman: "", en: "Yes" }]);
    expect(state.crisis).toEqual([{ name: "Line", phone: "109", url: null, hours: null }]);
  });

  test("ST-U3 correction이 none · unavailable이면 카드 없음, suggestions unavailable이면 칩을 바꾸지 않음", () => {
    const state = run([
      start,
      [
        "correction",
        {
          userMessageId: U1,
          status: "none",
          kind: null,
          original: "네",
          corrected: null,
          items: [],
          better: null,
          meaning: null,
        },
      ],
      ["suggestions", { messageId: A1, status: "unavailable", items: [], reason: "blocked" }],
    ]);
    expect(state.correction).toBeNull();
    expect(state.ideas).toBeNull();
  });

  test("ST-U4 error 이벤트 → 실패로 닫힘, 모르는 · 틀린 이벤트는 버림", () => {
    const state = run([
      start,
      ["ping", "{}"],
      ["delta", "not json"],
      ["delta", { segment: -1, kind: "speech", text: "x" }],
      ["error", { code: "upstream_unavailable", retryable: true }],
    ]);
    expect(state.bubbles).toEqual([]);
    expect(state.finished).toBe(true);
    expect(state.failure).toEqual({ kind: "stream-error", code: "upstream_unavailable" });
  });

  test("ST-U5 done 없이 끝나면 넘긴 실패로 닫고, done 뒤 끝은 그대로", () => {
    const partial = run([start, ["delta", { segment: 0, kind: "speech", text: "안" }]]);
    expect(endTurn(partial, "network", { kind: "failed" })).toMatchObject({
      finished: true,
      failure: { kind: "failed" },
      bubbles: [{ ko: "안", en: "" }],
    });
    const done = run([start, ["done", { assistantMessageId: A1, creditsSpent: 0, balance: null }]]);
    expect(endTurn(done, "complete", { kind: "failed" })).toBe(done);
  });

  test("ST-U6 끝난 턴에는 더 쌓지 않음", () => {
    const done = run([start, ["done", { assistantMessageId: A1, creditsSpent: 0, balance: null }]]);
    expect(
      applyTurnEvent(done, "delta", JSON.stringify({ segment: 0, kind: "speech", text: "x" })),
    ).toBe(done);
  });
});
