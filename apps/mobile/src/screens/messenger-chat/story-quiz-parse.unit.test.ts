import { expect, test } from "vitest";

import { historyFrom } from "./companion-parse";

// `unit` 계층(MS-U20 ~ U21): 대화 기록의 내 스토리 반응(origin `story_reaction`) 인용과 덕수쌤 퀴즈 `meta`(서버 반영 예상) 풀기.
// 칸이 없는 지금 서버에서는 퀴즈 표시가 하나도 생기지 않아야 합니다(회귀 0).

const at = (minute: number) => `2026-11-25T06:${String(minute).padStart(2, "0")}:00.000Z`;
const assistant = (id: string, minute: number, extra: Record<string, unknown> = {}) => ({
  id,
  role: "assistant",
  origin: "turn",
  status: "complete",
  hidden: false,
  text: null,
  inputMode: null,
  segments: [
    { kind: "speech", text: `${id} 말`, translation: `${id} says` },
    { kind: "speech", text: `${id} 둘째`, translation: "" },
  ],
  notice: null,
  feedback: null,
  createdAt: at(minute),
  ...extra,
});
const user = (id: string, minute: number, extra: Record<string, unknown> = {}) => ({
  id,
  role: "user",
  origin: "turn",
  status: "complete",
  hidden: false,
  text: `${id} 글`,
  inputMode: "text",
  segments: [],
  notice: null,
  feedback: null,
  createdAt: at(minute),
  ...extra,
});
const mine = {
  kind: "mine",
  id: "ms-1",
  characterId: "duksu",
  line: "야근",
  imagePath: null,
  postedAt: "2026-11-25T05:30:00.000Z",
};
const page = (messages: unknown[]) =>
  JSON.stringify({ messages: [...messages].reverse(), hasMore: false });

test("MS-U20. 반응 메시지 — 첫 말풍선에만 내 스토리 인용(mine · deleted), 서버가 무료 답을 알릴 때(quiz.freeAnswer)만 ask — 각도 quiz만으론 없음", () => {
  const history = historyFrom(
    page([
      assistant("m1", 1, {
        origin: "story_reaction",
        story: mine,
        meta: { myStoryId: "ms-1", angle: "quiz", quiz: { freeAnswer: true } },
      }),
      assistant("m2", 2, {
        origin: "story_reaction",
        story: { kind: "deleted", characterId: "haejun" },
        meta: { myStoryId: "ms-1", angle: "question" },
      }),
      assistant("m3", 3, {
        origin: "story_reaction",
        story: mine,
        meta: { myStoryId: "ms-1", angle: "quiz" },
      }),
    ]),
  );
  const [first, second, third] = history?.messages ?? [];
  expect(first).toMatchObject({
    id: "m1#0",
    from: "them",
    story: { storyId: "ms-1", line: "야근", kind: "mine" },
    quiz: { kind: "ask" },
  });
  expect(second).toMatchObject({ id: "m1#1" });
  expect(second).not.toHaveProperty("story");
  expect(second).not.toHaveProperty("quiz");
  expect(third).toMatchObject({ id: "m2#0", story: { kind: "deleted" } });
  expect(third).not.toHaveProperty("quiz");
  const quizOnlyAngle = history?.messages.find((m) => m.id === "m3#0");
  expect(quizOnlyAngle).toMatchObject({ story: { kind: "mine" } });
  expect(quizOnlyAngle).not.toHaveProperty("quiz");
});

test("MS-U21. 퀴즈 meta — 내 답(free · attempt · result) · 선물(gift.word)을 풀고, 칸이 없거나 틀리면 표시 없음", () => {
  const history = historyFrom(
    page([
      user("u1", 3, { meta: { quiz: { free: true, attempt: 1, result: "hint" } } }),
      user("u2", 4, { meta: { quiz: { free: true, attempt: 2 } } }),
      user("u3", 5, { meta: { quiz: { free: false, attempt: 1, result: "correct" } } }),
      user("u4", 6, { meta: { quiz: { free: true, attempt: 3, result: "correct" } } }),
      user("u5", 7, { meta: { quiz: { free: true, attempt: 1, result: "almost" } } }),
      assistant("m5", 8, { meta: { quiz: { gift: { word: "야근" } } } }),
      assistant("m6", 9, { meta: { quiz: { gift: { word: "" } } } }),
      user("u6", 10),
      assistant("m7", 11, { origin: "story_reaction", story: mine }),
    ]),
  );
  const byId = new Map((history?.messages ?? []).map((m) => [m.id, m]));
  expect(byId.get("u1")).toMatchObject({ quiz: { kind: "answer", attempt: 1, result: "hint" } });
  expect(byId.get("u2")).toMatchObject({ quiz: { kind: "answer", attempt: 2, result: null } });
  expect(byId.get("u3")).not.toHaveProperty("quiz"); // 무료가 아닌 답은 퀴즈 답 표시 없음
  expect(byId.get("u4")).not.toHaveProperty("quiz"); // attempt는 1 · 2만
  expect(byId.get("u5")).toMatchObject({ quiz: { kind: "answer", attempt: 1, result: null } });
  expect(byId.get("m5#0")).toMatchObject({ quiz: { kind: "gift", word: "야근" } });
  expect(byId.get("m5#1")).not.toHaveProperty("quiz");
  expect(byId.get("m6#0")).not.toHaveProperty("quiz");
  expect(byId.get("u6")).not.toHaveProperty("quiz");
  // 각도 meta가 없는 반응(지금 서버의 다른 경로) — 인용만, 퀴즈 없음
  expect(byId.get("m7#0")).toMatchObject({ story: { kind: "mine" } });
  expect(byId.get("m7#0")).not.toHaveProperty("quiz");
});
