import { describe, expect, test } from "vitest";

import { companionGreetRequestSchema, companionGreetResponseSchema } from "./greet";

const messageId = "c3e4f5a6-7b8c-4d9e-8f01-2a3b4c5d6e72";

describe("companion-greet", () => {
  test("CG1. 요청은 character_id, 플레이그라운드만 user_id(UUID)", () => {
    expect(companionGreetRequestSchema.parse({ character_id: "mina", extra: 1 })).toEqual({
      character_id: "mina",
    });
    expect(companionGreetRequestSchema.safeParse({ character_id: "" }).success).toBe(false);
    expect(
      companionGreetRequestSchema.safeParse({ character_id: "mina", user_id: "nope" }).success,
    ).toBe(false);
  });

  test("CG2. ok는 말풍선 · 출처 · 칩, none · unavailable은 이유만", () => {
    const ok = {
      status: "ok",
      messageId,
      segments: [
        { kind: "action", text: "손을 흔든다", translation: "waves" },
        { kind: "speech", text: "안녕! 나 미나야." },
      ],
      source: "model",
      suggestions: {
        messageId,
        status: "ok",
        items: [
          { text: "안녕! 반가워.", meaning: "Hi! Nice to meet you.", intent: "reflect" },
          { text: "어디에서 왔어?", meaning: "Where are you from?", intent: "ask" },
        ],
      },
    };
    expect(companionGreetResponseSchema.parse(ok)).toEqual(ok);
    const none = {
      status: "none",
      messageId: null,
      segments: [],
      suggestions: null,
      reason: "has_messages",
    };
    expect(companionGreetResponseSchema.parse(none)).toEqual(none);
    expect(companionGreetResponseSchema.safeParse({ ...none, reason: "other" }).success).toBe(
      false,
    );
  });
});
