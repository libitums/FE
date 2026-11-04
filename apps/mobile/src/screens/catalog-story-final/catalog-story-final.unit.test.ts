import { expect, test } from "vitest";

import {
  canCheckStoryTiles,
  initialStoryFinalState,
  judgeStoryTiles,
  storyFinalReducer,
  storyReplyText,
  storyTemplateParts,
  storyBlankSizes,
  storyTilesNeeded,
  storyTracePassed,
} from "./catalog-story-final";
import type {
  StoryFinalState,
  StoryFinalTilesTurn,
  StoryFinalTurn,
} from "./catalog-story-final.contract";

// `unit` 계층: 이야기 파이널의 진행(고르기 · 타일 · 음절 쓰기 · 다음 턴), 대답 글, 타일 판정, 따라 쓰기 문턱.

const base = {
  id: "S8-01",
  instruction: "Fill in the blank.",
  speakerName: "점원",
  line: { ko: "봉투 드릴까요?", roman: null, en: null },
  replyTranslation: null,
  answer: "따뜻한 물 주세요.",
  correctNote: null,
  imageUrl: null,
};

const tiles = (
  joiner: " " | "",
  template: string | null,
  ko: string[],
  accepted: string,
): StoryFinalTilesTurn => ({
  ...base,
  kind: "tiles",
  template,
  joiner,
  tiles: [
    { ko: ko[0] ?? "", roman: "" },
    ...ko.slice(1).map((piece) => ({ ko: piece, roman: "" })),
  ],
  accepted: [accepted],
});

const run = (actions: Parameters<typeof storyFinalReducer>[1][]): StoryFinalState =>
  actions.reduce(storyFinalReducer, initialStoryFinalState);

test("R1. 고르면 바로 판정되고, 판정 뒤 다시 골라도 바뀌지 않는다", () => {
  const state = run([
    { type: "pick", optionIndex: 2, result: "incorrect" },
    { type: "pick", optionIndex: 1, result: "correct" },
  ]);
  expect(state).toMatchObject({ phase: "checked", picked: 2, results: ["incorrect"] });
});

test("R2. 타일은 놓고 빼고, 빈 줄은 판정하지 않으며 판정 뒤에는 움직이지 않는다", () => {
  expect(run([{ type: "check", result: "correct" }]).phase).toBe("answering");
  const state = run([
    { type: "toggleTile", tileIndex: 1 },
    { type: "toggleTile", tileIndex: 0 },
    { type: "toggleTile", tileIndex: 1 },
    { type: "check", result: "incorrect" },
    { type: "toggleTile", tileIndex: 2 },
  ]);
  expect(state).toMatchObject({ phase: "checked", placed: [0], results: ["incorrect"] });
});

test("R3. 음절을 쓸 때마다 통과 여부가 쌓이고, 마지막 음절에서 모두 통과해야 맞힘이다", () => {
  const passing = run([
    { type: "writeSyllable", passed: true, total: 2 },
    { type: "writeSyllable", passed: true, total: 2 },
  ]);
  expect(passing).toMatchObject({ phase: "checked", written: [true, true], results: ["correct"] });
  const failing = run([
    { type: "writeSyllable", passed: true, total: 2 },
    { type: "writeSyllable", passed: false, total: 2 },
    { type: "writeSyllable", passed: true, total: 2 },
  ]);
  expect(failing).toMatchObject({ written: [true, false], results: ["incorrect"] });
  expect(run([{ type: "writeSyllable", passed: true, total: 3 }]).phase).toBe("answering");
});

test("R4. 다음 턴은 판정 뒤에만 가고 답 상태를 비운다", () => {
  expect(run([{ type: "nextTurn" }]).turnIndex).toBe(0);
  const state = run([{ type: "pick", optionIndex: 0, result: "correct" }, { type: "nextTurn" }]);
  expect(state).toEqual({
    turnIndex: 1,
    phase: "answering",
    picked: null,
    placed: [],
    written: [],
    results: ["correct"],
  });
});

test("C1. 대답 글은 틀의 빈칸에 답을 넣고, 틀이 없으면 답 그대로다", () => {
  const choice: StoryFinalTurn = {
    ...base,
    kind: "choice",
    template: "따뜻한 ___ 주세요.",
    options: [
      { ko: "봉투", roman: null },
      { ko: "물", roman: null },
    ],
    correctIndex: 1,
  };
  expect(storyReplyText(choice, { ...initialStoryFinalState, picked: 1 })).toBe(
    "따뜻한 물 주세요.",
  );
  expect(
    storyReplyText({ ...choice, template: null }, { ...initialStoryFinalState, picked: 0 }),
  ).toBe("봉투");
  expect(storyReplyText(choice, initialStoryFinalState)).toBe("따뜻한 ___ 주세요.");
  const syllable = tiles("", "방이 몇 ___?", ["이", "층", "에", "요"], "층이에요");
  expect(storyReplyText(syllable, { ...initialStoryFinalState, placed: [1, 0, 2, 3] })).toBe(
    "방이 몇 층이에요?",
  );
});

test("C2. 타일 판정은 잇는 방식대로 붙여 · 띄어 보고, 놓은 게 없으면 확인할 수 없다", () => {
  const syllable = tiles("", null, ["이", "층", "에", "요"], "층이에요");
  expect(canCheckStoryTiles([])).toBe(false);
  expect(judgeStoryTiles(syllable, [1, 0, 2, 3])).toBe("correct");
  expect(judgeStoryTiles(syllable, [0, 1, 2, 3])).toBe("incorrect");
  const words = tiles(" ", "아니요, ___.", ["괜찮아요", "영수증은"], "영수증은 괜찮아요");
  expect(judgeStoryTiles(words, [1, 0])).toBe("correct");
});

test("C3. 따라 쓰기 음절은 덮음 · 머무름이 둘 다 0.6 이상이면 통과, 모듈이 없으면 막지 않는다", () => {
  const compared = (coverage: number, stay: number) => ({
    status: "compared" as const,
    coverage,
    stay,
    drawnArea: 1,
    guideArea: 1,
    font: "f",
    guideBox: "",
  });
  expect(storyTracePassed(compared(0.6, 0.6))).toBe(true);
  expect(storyTracePassed(compared(0.85, 0.59))).toBe(false);
  expect(storyTracePassed({ status: "empty-strokes" })).toBe(false);
  expect(storyTracePassed({ status: "failed" })).toBe(true);
  expect(storyTracePassed({ status: "unavailable" })).toBe(true);
});

test("C4. 틀은 빈칸 앞 · 뒤로 가르고, 틀이 없으면 둘 다 비어 있다", () => {
  expect(storyTemplateParts("___ 할게요.")).toEqual({ before: "", after: "할게요." });
  expect(storyTemplateParts("저는 {나라}에서 ___. 여기서")).toEqual({
    before: "저는 {나라}에서",
    after: ". 여기서",
  });
  expect(storyTemplateParts(null)).toEqual({ before: "", after: "" });
});

test("C5b. 밑줄 폭은 정답 순서대로 각 조각의 음절 수다 — 문장부호 · 공백은 세지 않는다(사용자 지적 2026-11-04)", () => {
  expect(
    storyBlankSizes(
      tiles(" ", null, ["처음이에요!", "안녕하세요!", "네,"], "안녕하세요! 네, 처음이에요!"),
    ),
  ).toEqual([5, 1, 5]);
  expect(
    storyBlankSizes(
      tiles(" ", "아니요, ___.", ["괜찮아요", "봉투", "영수증은"], "영수증은 괜찮아요"),
    ),
  ).toEqual([4, 4]);
  expect(storyBlankSizes(tiles("", null, ["요", "세", "안", "녕", "하"], "안녕하세요"))).toEqual([
    1, 1, 1, 1, 1,
  ]);
});

test("C5c. 정답을 타일로 덮지 못하면 크기를 모른다(0) — 개수는 타일 전부다", () => {
  expect(
    storyBlankSizes(tiles(" ", null, ["괜찮아요", "봉투", "영수증은"], "전혀 다른 말")),
  ).toEqual([0, 0, 0]);
});

test("C5. 밑줄 수는 정답에 들어가는 타일 수다 — 남는 타일(오답 보기)은 세지 않고, 못 맞추면 타일 전부다", () => {
  expect(
    storyTilesNeeded(
      tiles(" ", null, ["처음이에요!", "안녕하세요!", "네,"], "안녕하세요! 네, 처음이에요!"),
    ),
  ).toBe(3);
  expect(
    storyTilesNeeded(
      tiles(" ", "아니요, ___.", ["괜찮아요", "봉투", "영수증은"], "영수증은 괜찮아요"),
    ),
  ).toBe(2);
  expect(storyTilesNeeded(tiles("", null, ["요", "세", "안", "녕", "하"], "안녕하세요"))).toBe(5);
  expect(storyTilesNeeded(tiles(" ", null, ["괜찮아요", "봉투", "영수증은"], "전혀 다른 말"))).toBe(
    3,
  );
});
