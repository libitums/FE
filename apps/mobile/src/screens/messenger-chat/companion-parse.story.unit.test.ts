import { describe, expect, test } from "vitest";

import { historyFrom } from "./companion-parse";

// `unit` 계층(SS-S1, state-data): 서버 기록의 내 글에 실린 스토리 인용(`message_json.story`, ADR-0178 D5)을 다시 세운다.

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "55555555-5555-4555-8555-555555555555";
const user = (id: string, story: unknown) => ({
  id,
  role: "user",
  origin: "turn",
  status: "complete",
  hidden: false,
  text: "맛있겠다!",
  createdAt: "2026-11-23T03:10:00.000Z",
  feedback: null,
  story,
});

describe("SS-S1 스토리 인용", () => {
  test("story가 있으면 인용으로, 없거나 틀리면 칸이 없다", () => {
    const history = historyFrom(
      JSON.stringify({
        messages: [
          user(U2, { id: "bad" }),
          user(U1, {
            id: "st-1",
            characterId: "mina",
            line: "우산 없는데 비가 많이 와요…",
            imagePath: "content/images/u08-umbrella/post-2.webp",
            postedAt: "2026-11-23T03:00:00.000Z",
          }),
        ],
        hasMore: false,
      }),
    );
    const [first, second] = history?.messages ?? [];
    expect(first).toMatchObject({
      id: U1,
      kind: "text",
      from: "me",
      story: {
        storyId: "st-1",
        characterId: "mina",
        line: "우산 없는데 비가 많이 와요…",
        imagePath: "content/images/u08-umbrella/post-2.webp",
        postedAt: Date.parse("2026-11-23T03:00:00.000Z"),
      },
    });
    expect(second).not.toHaveProperty("story");
  });

  test("그림 · 시각이 없어도 인용은 선다(글만)", () => {
    const history = historyFrom(
      JSON.stringify({
        messages: [user(U1, { id: "st-1", characterId: "mina", line: "한 줄", imagePath: null })],
        hasMore: false,
      }),
    );
    expect(history?.messages[0]).toMatchObject({
      story: { storyId: "st-1", imagePath: null, postedAt: null },
    });
  });
});
