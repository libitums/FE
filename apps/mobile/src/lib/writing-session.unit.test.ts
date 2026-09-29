import { expect, test } from "vitest";

import type { Stroke } from "./handwriting-recognition";
import { writingPassCriterion } from "./writing-judge";
import {
  currentWritingSyllable,
  initialWritingSessionState,
  isLastWritingSyllable,
  writingBlank,
  writingPromptLabel,
  writingSessionReducer,
  type WritingQuestion,
  type WritingSessionAction,
  type WritingSessionState,
} from "./writing-session";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4). 문항은 이 파일의 대역입니다.

const question: WritingQuestion = {
  id: "q",
  before: "이 화장품 찾아",
  syllables: ["주", "세", "요"],
  after: ".",
  translation: "Please help me find this cosmetic product.",
  passCriterion: writingPassCriterion,
};

const stroke: Stroke = [
  { x: 1, y: 1 },
  { x: 2, y: 2 },
];

function run(...actions: WritingSessionAction[]): WritingSessionState {
  return actions.reduce(writingSessionReducer, initialWritingSessionState);
}

const correct: WritingSessionAction = {
  type: "judgement",
  judgement: { kind: "judged", result: "correct" },
};
const incorrect: WritingSessionAction = {
  type: "judgement",
  judgement: { kind: "judged", result: "incorrect" },
};

// WS1
test("[WS1] 쓰는 중에 획이 쌓이고, 지우면 비워진다", () => {
  const written = run({ type: "stroke", stroke }, { type: "stroke", stroke });
  expect(written.strokes).toHaveLength(2);
  expect(writingSessionReducer(written, { type: "clear" }).strokes).toEqual([]);
});

// WS2 — 빈 판은 잴 것이 없습니다. 견주기를 열면 호스트가 `empty-strokes`만 돌려줍니다.
test("[WS2] 획이 없으면 견주기로 가지 않는다", () => {
  expect(run({ type: "check" })).toBe(initialWritingSessionState);
  expect(run({ type: "stroke", stroke }, { type: "check" }).phase).toBe("judging");
});

// WS3 — 재는 중에는 판이 굳습니다. 지워지면 「지운 판의 점수」가 서고, 획이 더해지면 잰 것과
// 보이는 것이 갈립니다.
test("[WS3] 재는 중에는 획 · 지우기 · 다시 견주기를 받지 않는다", () => {
  const judging = run({ type: "stroke", stroke }, { type: "check" });
  expect(writingSessionReducer(judging, { type: "stroke", stroke })).toBe(judging);
  expect(writingSessionReducer(judging, { type: "clear" })).toBe(judging);
  expect(writingSessionReducer(judging, { type: "check" })).toBe(judging);
});

// WS4 — 판정 답은 재는 중에만 받습니다. 늦게 온 답이 다른 국면을 흔들지 않습니다.
test("[WS4] 재는 중에 온 판정만 받고, 판정 뒤 다시 온 답은 무시한다", () => {
  const judged = run({ type: "stroke", stroke }, { type: "check" }, correct);
  expect(judged).toMatchObject({ phase: "judged", verdict: "correct" });
  expect(writingSessionReducer(judged, incorrect)).toBe(judged);
  expect(run(correct)).toBe(initialWritingSessionState);
});

// WS5 — 틀리면 같은 음절을 다시 씁니다. 맞은 음절은 되돌리지 않습니다.
test("[WS5] 틀린 뒤에만 다시 쓰기로 획을 비우고 같은 음절로 돌아간다", () => {
  const wrong = run({ type: "stroke", stroke }, { type: "check" }, incorrect);
  expect(writingSessionReducer(wrong, { type: "retry" })).toEqual({
    ...initialWritingSessionState,
    syllableIndex: 0,
  });

  const right = run({ type: "stroke", stroke }, { type: "check" }, correct);
  expect(writingSessionReducer(right, { type: "retry" })).toBe(right);
});

// WS6 — 넘어갈 때의 판정을 싣습니다. 다시 써서 맞으면 맞은 것으로 남습니다.
test("[WS6] 다음은 판정을 싣고 다음 음절의 빈 판으로 간다 — 다시 써서 맞으면 정답이 실린다", () => {
  const retried = run(
    { type: "stroke", stroke },
    { type: "check" },
    incorrect,
    { type: "retry" },
    { type: "stroke", stroke },
    { type: "check" },
    correct,
    { type: "next" },
  );
  expect(retried).toEqual({
    syllableIndex: 1,
    phase: "writing",
    strokes: [],
    verdict: null,
    results: ["correct"],
  });
});

// WS7 — 잴 수 없는 음절은 결과에 싣지 않고 넘어갑니다.
test("[WS7] 잴 수 없으면 결과 없이 다음 음절로 간다", () => {
  const skipped = run(
    { type: "stroke", stroke },
    { type: "check" },
    { type: "judgement", judgement: { kind: "unmeasurable" } },
    { type: "next" },
  );
  expect(skipped).toMatchObject({ syllableIndex: 1, phase: "writing", results: [] });
});

// WS8 — 「획이 없다」는 쓰는 중으로 돌아가고 쓴 획을 지우지 않습니다.
test("[WS8] 다시 쓰기 판정은 획을 남긴 채 쓰는 중으로 돌아간다", () => {
  const back = run(
    { type: "stroke", stroke },
    { type: "check" },
    { type: "judgement", judgement: { kind: "rewrite" } },
  );
  expect(back).toMatchObject({ phase: "writing", strokes: [stroke] });
});

// WS9 — 판정 전에는 넘어가지 않습니다.
test("[WS9] 쓰는 중 · 재는 중에는 다음으로 가지 않는다", () => {
  const writing = run({ type: "stroke", stroke });
  expect(writingSessionReducer(writing, { type: "next" })).toBe(writing);
  const judging = writingSessionReducer(writing, { type: "check" });
  expect(writingSessionReducer(judging, { type: "next" })).toBe(judging);
});

// WS10
test("[WS10] 지금 음절 · 마지막 음절 여부를 순번에서 읽는다", () => {
  expect(currentWritingSyllable(initialWritingSessionState, question)).toBe("주");
  expect(isLastWritingSyllable(initialWritingSessionState, question)).toBe(false);
  const last = { ...initialWritingSessionState, syllableIndex: 2 };
  expect(currentWritingSyllable(last, question)).toBe("요");
  expect(isLastWritingSyllable(last, question)).toBe(true);
  expect(currentWritingSyllable({ ...last, syllableIndex: 3 }, question)).toBeNull();
});

// WS11 — 빈칸 표시는 음절 수만큼이고, 보조기술은 「빈칸」으로 읽습니다.
test("[WS11] 빈칸은 음절 수만큼의 밑줄이고, 낭독 이름은 밑줄 대신 빈칸이다", () => {
  expect(writingBlank(question)).toBe("_ _ _");
  expect(writingBlank({ ...question, syllables: ["어", "디"] })).toBe("_ _");
  expect(writingPromptLabel(question)).toBe("이 화장품 찾아 빈칸 .");
  expect(writingPromptLabel({ ...question, before: "", after: "" })).toBe("빈칸");
});
