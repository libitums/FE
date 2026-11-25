import { expect, test, vi } from "vitest";

import { myStoriesRemote } from "../../lib/companion-my-stories-api";

import { historyFrom } from "./companion-parse";
import { myStoriesFrom, myStoryPostFrom } from "./my-stories-parse";
import { editorCapsOf, editorShareOf, placeSticker } from "./my-story-editor";
import { wordChoice } from "./my-stories.test-support";
import { quizFreeOf } from "./story-quiz";

// `unit` 계층(MS-U40 ~ U44): 서버 PR #598(ADR-0191 D13 · D14 · D15) 계약 — 조합 스토리(바탕 × 얹은 것) · kinds(text · photo) ·
// 새 올리기 결과(check_limit · invalid) · 퀴즈 답 skipped. 옛 서버(kinds 없음 → word · card)와 둘 다에서 동작해야 합니다.

const newServer = editorCapsOf(["text", "photo"]);
const oldServer = editorCapsOf(["word", "card"]);

test("MS-U40. 도구 — 새 서버(text · photo)는 Aa · 단어(색 + 단어) 둘 다 · 여덟, 옛 서버는 단어 하나, 아무것도 없으면 단어도 없음", () => {
  expect(newServer).toEqual({
    text: true,
    word: true,
    wordRpc: false,
    photo: true,
    maxStickers: 8,
  });
  expect(oldServer).toEqual({
    text: false,
    word: true,
    wordRpc: true,
    photo: false,
    maxStickers: 1,
  });
  expect(editorCapsOf(["word", "card", "text"])).toMatchObject({
    text: true,
    word: true,
    wordRpc: true,
  });
  expect(editorCapsOf([])).toEqual({
    text: false,
    word: false,
    wordRpc: false,
    photo: false,
    maxStickers: 1,
  });
});

test("MS-U41. 올릴 길 — 새 서버는 단어 하나만 얹어도 색 바탕 스토리(post + background), 옛 서버는 지금처럼 단어 RPC", () => {
  const one = placeSticker([], wordChoice("w1"), newServer, "s1");
  expect(editorShareOf("green", one, null, newServer)).toMatchObject({
    kind: "text",
    background: "green",
    text: null,
    overlays: [{ kind: "word", ko: "야근", word: { episodeId: "u01", ref: "voca:w1" } }],
  });
  const old = placeSticker([], wordChoice("w1"), oldServer, "s1");
  expect(editorShareOf("green", old, null, oldServer)).toEqual({
    kind: "choice",
    choice: wordChoice("w1"),
  });
  // 글 서버가 word도 받으면(전환기) 단어 하나는 단어 RPC — 반응 각도 word를 살림
  const both = editorCapsOf(["word", "card", "text"]);
  expect(editorShareOf("green", old, null, both)).toMatchObject({ kind: "choice" });
});

test("MS-U42. 읽기 · 올리기 결과 — kinds [text, photo], 색 바탕 스토리, check_limit · invalid는 그대로(화면이 안내)", () => {
  const state = myStoriesFrom(
    JSON.stringify({
      enabled: true,
      kinds: ["text", "photo"],
      stories: [
        {
          id: "t1",
          kind: "text",
          word: null,
          ko: "",
          roman: "",
          meaning: "",
          example: null,
          background: "blue",
          overlays: [
            { kind: "word", ko: "찌개", x: 0.5, y: 0.5, scale: 1, rotation: 0 },
            { kind: "text", ko: "맛있어", color: "white", x: 0.5, y: 0.3, scale: 1, rotation: 0 },
          ],
          postedAt: "2026-11-25T05:00:00.000Z",
          expiresAt: "2026-11-26T05:00:00.000Z",
          reactions: [],
          seenBy: [],
        },
      ],
    }),
  );
  expect(state?.kinds).toEqual(["text", "photo"]);
  expect(state?.stories[0]).toMatchObject({ kind: "text", background: "blue" });
  expect(state?.stories[0]?.overlays[1]).toMatchObject({ kind: "text", color: "white" });
  expect(myStoryPostFrom(JSON.stringify({ result: "check_limit" }))).toEqual({
    result: "check_limit",
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "invalid" }))).toEqual({ result: "invalid" });
});

const at = (minute: number) => `2026-11-25T06:${String(minute).padStart(2, "0")}:00.000Z`;
const message = (id: string, role: string, minute: number, extra: Record<string, unknown>) => ({
  id,
  role,
  origin: "turn",
  status: "complete",
  hidden: false,
  text: role === "user" ? `${id} 글` : null,
  inputMode: role === "user" ? "text" : null,
  segments: role === "user" ? [] : [{ kind: "speech", text: `${id} 말`, translation: "" }],
  notice: null,
  feedback: null,
  createdAt: at(minute),
  ...extra,
});

test("MS-U43. 퀴즈 답 skipped — 무료 답 표시는 남고 결과는 skipped, 그 뒤로는 무료가 아님(퀴즈를 닫음)", () => {
  const history = historyFrom(
    JSON.stringify({
      messages: [
        message("u1", "user", 2, { meta: { quiz: { free: true, attempt: 1, result: "skipped" } } }),
        message("m1", "assistant", 1, {
          meta: {
            angle: "quiz",
            myStoryId: "11111111-1111-4111-8111-111111111111",
            quiz: { freeAnswer: true },
          },
        }),
      ],
      hasMore: false,
    }),
  );
  const messages = history?.messages ?? [];
  expect(messages.find((m) => m.id === "u1")).toMatchObject({
    quiz: { kind: "answer", attempt: 1, result: "skipped" },
  });
  expect(quizFreeOf(messages)).toBeNull();
});

test("MS-U44. 색 바탕 올리기 요청 — post + background(image_path 없음) · client_region(알 때만), crisis는 기관과 함께", async () => {
  const call = vi.fn(async (_path: string, _body: unknown) =>
    JSON.stringify({ result: "crisis", resources: [{ name: "Lifeline", phone: "109" }] }),
  );
  const remote = myStoriesRemote(call);
  const draft = {
    clientId: "00000000-0000-4000-8000-000000000001",
    background: "orange" as const,
    ko: "",
    overlays: [],
    lang: "en",
    tzOffsetMin: 540,
  };
  expect(await remote.postText({ ...draft, region: "KR" })).toEqual({
    result: "crisis",
    resources: [{ name: "Lifeline", phone: "109", url: null, hours: null }],
  });
  const [path, body] = call.mock.calls[0] ?? [];
  expect(path).toBe("/functions/v1/companion-my-story");
  expect(body).toEqual({
    action: "post",
    client_id: draft.clientId,
    background: "orange",
    ko: "",
    overlays: [],
    lang: "en",
    tz_offset_min: 540,
    client_region: "KR",
  });
  expect(body).not.toHaveProperty("image_path");
  await remote.postText({ ...draft, region: null });
  expect(call.mock.calls[1]?.[1]).not.toHaveProperty("client_region");
});
