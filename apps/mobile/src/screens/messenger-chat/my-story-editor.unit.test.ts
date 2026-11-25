import { expect, test } from "vitest";

import {
  editorCapsOf,
  editorShareOf,
  moveSticker,
  pinchSticker,
  placeSticker,
  type EditorSticker,
} from "./my-story-editor";
import { myStoriesFrom, myStoryCorrectionFrom, myStoryPostFrom } from "./my-stories-parse";
import { cardChoice, wordChoice } from "./my-stories.test-support";

// `unit` 계층(MS-U23 ~ U29): 스토리 만들기 — 바탕 위 편집(시안 26 ~ 28) 판정과 서버 반영 예상 칸(`kinds` · 글 스토리 · 교정) 풀기. 순수.

const textCaps = editorCapsOf(["word", "card", "text"]);
const oldCaps = editorCapsOf(["word", "card"]);

test("MS-U23. 켤 도구 — text가 있으면 Aa · 스티커 8, 없으면(지금 서버) 스티커 하나, photo가 있어야 사진 버튼", () => {
  expect(oldCaps).toEqual({ text: false, photo: false, maxStickers: 1 });
  expect(textCaps).toEqual({ text: true, photo: false, maxStickers: 8 });
  expect(editorCapsOf(["word", "card", "text", "photo"]).photo).toBe(true);
  expect(editorCapsOf([])).toEqual({ text: false, photo: false, maxStickers: 1 });
});

test("MS-U24. 스티커 놓기 — 가운데에 놓고, 하나만 되는 서버면 바꿔 끼우고, 여덟을 넘지 않는다", () => {
  const one = placeSticker([], wordChoice("w1"), oldCaps, "s1");
  expect(one).toEqual([
    { id: "s1", choice: wordChoice("w1"), x: 0.5, y: 0.55, scale: 1, rotation: -4 },
  ]);
  const swapped = placeSticker(one, cardChoice("c1", "u01", "도착하다"), oldCaps, "s2");
  expect(swapped.map((s) => s.id)).toEqual(["s2"]);
  let many: readonly EditorSticker[] = [];
  for (let i = 0; i < 10; i += 1) many = placeSticker(many, wordChoice(`w${i}`), textCaps, `s${i}`);
  expect(many).toHaveLength(8);
  // 겹치지 않게 조금씩 비켜 놓는다
  expect(new Set(many.map((s) => `${s.x},${s.y}`)).size).toBe(8);
});

test("MS-U25. 끌기 · 두 손가락 — 비율 안으로 자르고, 크기 0.5 ~ 3 · 회전은 두 점의 각도 차", () => {
  const s: EditorSticker = {
    id: "s",
    choice: wordChoice("w"),
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
  };
  expect(moveSticker(s, 0.2, -0.1)).toMatchObject({ x: 0.7, y: 0.4 });
  expect(moveSticker(s, 0.9, 0.9)).toMatchObject({ x: 1, y: 1 });
  const pinched = pinchSticker(
    s,
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 200 },
    ],
  );
  expect(pinched.scale).toBe(2);
  expect(Math.round(pinched.rotation)).toBe(90);
  const tiny = pinchSticker(
    s,
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
  );
  expect(tiny.scale).toBe(0.5);
});

test("MS-U26. 올릴 길 — 지금 서버는 스티커 하나 · 글 없음일 때만 단어 · 카드 올리기, 글 서버는 글 스토리(얹은 것 overlays)", () => {
  const w = placeSticker([], wordChoice("w1"), oldCaps, "s1");
  expect(editorShareOf("orange", [], null, oldCaps)).toBeNull();
  expect(editorShareOf("orange", w, null, oldCaps)).toEqual({
    kind: "choice",
    choice: wordChoice("w1"),
  });
  // 글 서버에서도 스티커 하나 · 글 없음이면 단어 스토리(반응 각도 word를 살림)
  expect(editorShareOf("green", w, null, textCaps)).toEqual({
    kind: "choice",
    choice: wordChoice("w1"),
  });
  const text = {
    ko: "오늘 처음으로 김치찌개를 만들었어!",
    meaning: "I made kimchi stew",
    original: "오늘 처음 김치찌개를 만들었어!",
  };
  const shared = editorShareOf("green", w, text, textCaps);
  expect(shared).toEqual({
    kind: "text",
    background: "green",
    text,
    overlays: [
      {
        kind: "word",
        ko: "야근",
        roman: "yageun",
        meaning: "overtime",
        word: { episodeId: "u01", ref: "voca:w1" },
        x: 0.5,
        y: 0.55,
        scale: 1,
        rotation: -4,
      },
    ],
  });
  expect(editorShareOf("blue", [], text, textCaps)).toMatchObject({ kind: "text", overlays: [] });
});

test("MS-U27. 읽기 — kinds(없으면 word · card), 글 스토리(바탕 · overlays), 모르는 바탕은 orange, 틀린 overlay는 버림", () => {
  const state = myStoriesFrom(
    JSON.stringify({
      enabled: true,
      kinds: ["word", "card", "text", "video"],
      stories: [
        {
          id: "t1",
          kind: "text",
          word: null,
          ko: "오늘 처음으로 김치찌개를 만들었어!",
          roman: "",
          meaning: "I made kimchi stew",
          example: null,
          background: "green",
          overlays: [
            { kind: "word", ko: "찌개", meaning: "stew", x: 0.3, y: 0.6, scale: 1.2, rotation: -6 },
            { kind: "word", ko: "", x: 0.3, y: 0.6, scale: 1, rotation: 0 },
          ],
          postedAt: "2026-11-25T03:00:00.000Z",
          expiresAt: "2026-11-26T03:00:00.000Z",
          reactions: [],
        },
        {
          id: "t2",
          kind: "text",
          word: null,
          ko: "안녕",
          roman: "",
          meaning: "",
          example: null,
          background: "pink",
          postedAt: "2026-11-25T03:00:00.000Z",
          expiresAt: "2026-11-26T03:00:00.000Z",
          reactions: [],
        },
      ],
    }),
  );
  expect(state?.kinds).toEqual(["word", "card", "text"]);
  expect(state?.stories[0]).toMatchObject({
    kind: "text",
    word: null,
    background: "green",
    overlays: [
      { kind: "word", ko: "찌개", meaning: "stew", x: 0.3, y: 0.6, scale: 1.2, rotation: -6 },
    ],
  });
  expect(state?.stories[1]?.background).toBe("orange");
  expect(myStoriesFrom(JSON.stringify({ enabled: true, stories: [] }))?.kinds).toEqual([
    "word",
    "card",
  ]);
});

test("MS-U28. 교정 — ok면 고친 글 · 뜻 · 팁, text_blocked · crisis는 blocked, draft_limit은 limit, 그 밖 failed", () => {
  expect(
    myStoryCorrectionFrom(
      JSON.stringify({
        result: "ok",
        draft: {
          kind: "correction",
          ko: "오늘 처음으로 만들었어",
          meaning: "I made it",
          tip: "처음 → 처음으로",
        },
      }),
    ),
  ).toEqual({
    result: "ok",
    correction: {
      kind: "correction",
      ko: "오늘 처음으로 만들었어",
      meaning: "I made it",
      tip: "처음 → 처음으로",
    },
  });
  expect(myStoryCorrectionFrom(JSON.stringify({ result: "text_blocked" }))).toEqual({
    result: "blocked",
  });
  expect(myStoryCorrectionFrom(JSON.stringify({ result: "crisis" }))).toEqual({
    result: "blocked",
  });
  expect(myStoryCorrectionFrom(JSON.stringify({ result: "draft_limit" }))).toEqual({
    result: "limit",
  });
  expect(myStoryCorrectionFrom(JSON.stringify({ result: "ok", draft: null }))).toEqual({
    result: "failed",
  });
  expect(myStoryCorrectionFrom(null)).toEqual({ result: "failed" });
});

test("MS-U29. 글 스토리 올리기 결과 — text_blocked는 그대로, 나머지는 RPC 결과와 같다", () => {
  expect(myStoryPostFrom(JSON.stringify({ result: "text_blocked", story: null }))).toEqual({
    result: "text_blocked",
  });
});
