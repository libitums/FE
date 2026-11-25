import { expect, test } from "vitest";

import {
  editorCapsOf,
  editorShareOf,
  moveSticker,
  pinchSticker,
  placeSticker,
  resizeSticker,
  typedText,
  type EditorSticker,
  type EditorText,
} from "./my-story-editor";
import { myStoriesFrom, myStoryPostFrom } from "./my-stories-parse";
import { cardChoice, wordChoice } from "./my-stories.test-support";

// `unit` 계층(MS-U23 ~ U29): 스토리 만들기 — 바탕 위 편집(시안 26 ~ 28) 판정과 서버 반영 예상 칸(`kinds` · 글 스토리 · 검수 결과) 풀기. 순수.

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
  const text: EditorText = {
    ko: "오늘 처음으로 김치찌개를 만들었어!",
    color: "brown",
    x: 0.5,
    y: 0.3,
    scale: 0.8,
    rotation: 0,
  };
  const shared = editorShareOf("green", w, text, textCaps);
  expect(shared).toEqual({
    kind: "text",
    background: "green",
    text,
    overlays: [
      {
        kind: "text",
        ko: "오늘 처음으로 김치찌개를 만들었어!",
        roman: "oneul cheoeumeuro gimchijjigaereul mandeureosseo!",
        color: "brown",
        x: 0.5,
        y: 0.3,
        scale: 0.8,
        rotation: 0,
      },
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
  expect(editorShareOf("blue", [], text, textCaps)).toMatchObject({
    kind: "text",
    overlays: [{ kind: "text" }],
  });
});

test("MS-U30. 글 상자(시안 29 · 30) — Done이면 쓴 글 그대로 가운데 위에(교정 없음), 빈 글이면 없앰, 다시 쓰면 자리 · 크기를 잇는다", () => {
  expect(typedText("   ", "brown", null)).toBeNull();
  const first = typedText(" 오늘 처음 김치찌개 만들었어 ", "white", null);
  expect(first).toEqual({
    ko: "오늘 처음 김치찌개 만들었어",
    color: "white",
    x: 0.5,
    y: 0.3,
    scale: 1,
    rotation: 0,
  });
  const moved = first === null ? null : { ...first, x: 0.2, scale: 0.6 };
  expect(typedText("고쳤어", "brown", moved)).toMatchObject({ x: 0.2, scale: 0.6, ko: "고쳤어" });
});

test("MS-U31. 모서리 손잡이 — 바깥으로 끌면 커지고 안으로 끌면 작아진다(0.5 ~ 3), 글 상자도 스티커처럼 몫을 센다", () => {
  const s: EditorSticker = {
    id: "s",
    choice: wordChoice("w"),
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
  };
  expect(resizeSticker(s, 160, 160).scale).toBe(2);
  expect(resizeSticker(s, -80, -80).scale).toBe(0.5);
  expect(resizeSticker(s, 1000, 1000).scale).toBe(3);
  let seven: readonly EditorSticker[] = [];
  for (let i = 0; i < 8; i += 1)
    seven = placeSticker(seven, wordChoice(`w${i}`), textCaps, `s${i}`, true);
  expect(seven).toHaveLength(7);
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

test("MS-U28. 교정은 없다 — 글 스토리 올리기 요청에 뜻 · 원래 글을 싣지 않고, 글 상자 overlay엔 앱이 만든 로마자만", () => {
  const share = editorShareOf(
    "orange",
    [],
    { ko: "안녕", color: "black", x: 0.5, y: 0.3, scale: 1, rotation: 0 },
    textCaps,
  );
  expect(share).toEqual({
    kind: "text",
    background: "orange",
    text: { ko: "안녕", color: "black", x: 0.5, y: 0.3, scale: 1, rotation: 0 },
    overlays: [
      {
        kind: "text",
        ko: "안녕",
        roman: "annyeong",
        color: "black",
        x: 0.5,
        y: 0.3,
        scale: 1,
        rotation: 0,
      },
    ],
  });
});

test("MS-U29. 글 스토리 올리기 결과 — text_blocked는 그대로, crisis는 위기 안내 기관과 함께, 나머지는 RPC 결과와 같다", () => {
  expect(myStoryPostFrom(JSON.stringify({ result: "text_blocked", story: null }))).toEqual({
    result: "text_blocked",
  });
  expect(
    myStoryPostFrom(
      JSON.stringify({ result: "crisis", resources: [{ name: "Helpline", phone: "1393" }] }),
    ),
  ).toEqual({
    result: "crisis",
    resources: [{ name: "Helpline", phone: "1393", url: null, hours: null }],
  });
  expect(myStoryPostFrom(JSON.stringify({ result: "crisis" }))).toEqual({
    result: "crisis",
    resources: [],
  });
});
