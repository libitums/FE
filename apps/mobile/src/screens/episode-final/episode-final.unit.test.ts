import { describe, expect, test } from "vitest";

import type { EpisodeFinalWordChoiceQuestion } from "./episode-final.contract";
import {
  episodeFinalOptionState,
  episodeFinalProgressLabel,
  episodeFinalPromptLabel,
  episodeFinalPromptLine,
  episodeFinalSessionReducer,
  initialEpisodeFinalSessionState,
  latestCallLine,
  judgeWordChoice,
} from "./episode-final";
import { episodeFinalTestFor } from "./episode-final-tests";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

const question: EpisodeFinalWordChoiceQuestion = {
  kind: "word-choice",
  id: "q",
  speakerName: "나",
  before: "이 화장품 찾아",
  after: ".",
  translation: "Please help me find this cosmetic product.",
  options: ["오세요", "주세요", "있어요"],
  answerIndex: 1,
};

describe("episodeFinalSessionReducer", () => {
  test("[EF1] 보기를 고르면 판정으로 가고 결과를 싣는다", () => {
    const next = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
      type: "choose",
      optionIndex: 0,
      result: "incorrect",
    });
    expect(next).toEqual({
      questionIndex: 0,
      phase: "judged",
      chosenIndex: 0,
      recognized: "",
      results: ["incorrect"],
    });
  });

  test("[EF2] 판정 뒤에 다시 골라도 바뀌지 않는다", () => {
    const judged = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
      type: "choose",
      optionIndex: 1,
      result: "correct",
    });
    expect(
      episodeFinalSessionReducer(judged, { type: "choose", optionIndex: 0, result: "incorrect" }),
    ).toBe(judged);
  });

  test("[EF3] 말하기 — 듣는 중에 인식이 오면 판정으로 간다. 듣기 전의 인식은 무시한다", () => {
    const ignored = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
      type: "recognized",
      text: "이거 주세요",
      result: "correct",
    });
    expect(ignored).toBe(initialEpisodeFinalSessionState);

    const listening = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
      type: "start",
    });
    expect(listening.phase).toBe("listening");
    const judged = episodeFinalSessionReducer(listening, {
      type: "recognized",
      text: "이거 주세요",
      result: "correct",
    });
    expect(judged).toMatchObject({ phase: "judged", recognized: "이거 주세요" });
    expect(judged.results).toEqual(["correct"]);
  });

  test("[EF4] 인식을 쓸 수 없으면 결과 없이 건너뛴다", () => {
    const unavailable = episodeFinalSessionReducer(
      episodeFinalSessionReducer(initialEpisodeFinalSessionState, { type: "start" }),
      { type: "unavailable" },
    );
    expect(unavailable.phase).toBe("unavailable");
    const next = episodeFinalSessionReducer(unavailable, { type: "next" });
    expect(next).toEqual({ ...initialEpisodeFinalSessionState, questionIndex: 1 });
  });

  test("[EF5] 판정 전에는 넘어가지 않고, 판정 뒤에는 다음 문항으로 결과를 이어 간다", () => {
    expect(episodeFinalSessionReducer(initialEpisodeFinalSessionState, { type: "next" })).toBe(
      initialEpisodeFinalSessionState,
    );
    const judged = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
      type: "choose",
      optionIndex: 1,
      result: "correct",
    });
    expect(episodeFinalSessionReducer(judged, { type: "next" })).toEqual({
      questionIndex: 1,
      phase: "ready",
      chosenIndex: null,
      recognized: "",
      results: ["correct"],
    });
  });
});

test("[EF12] 말하기 전에만 건너뛸 수 있고, 건너뛰면 결과 없이 다음 문항으로 간다", () => {
  const skipped = episodeFinalSessionReducer(initialEpisodeFinalSessionState, { type: "skip" });
  expect(skipped).toEqual({ ...initialEpisodeFinalSessionState, questionIndex: 1 });

  const listening = episodeFinalSessionReducer(initialEpisodeFinalSessionState, { type: "start" });
  expect(episodeFinalSessionReducer(listening, { type: "skip" })).toBe(listening);
});

// EF14 — 쓰기는 판정과 `Next`를 문항 안에서 지나 오므로 이 세션에는 결과와 넘김이 한 번에
// 옵니다. 잰 음절이 없던 문항(`null`)을 오답으로 접으면 기기 탓이 학습자 탓이 됩니다.
test("[EF14] 쓰기를 끝내면 결과를 싣고 곧장 다음 문항으로 간다. 결과가 없으면 싣지 않는다", () => {
  const written = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
    type: "written",
    result: "incorrect",
  });
  expect(written).toEqual({
    ...initialEpisodeFinalSessionState,
    questionIndex: 1,
    results: ["incorrect"],
  });

  const skipped = episodeFinalSessionReducer(written, { type: "written", result: null });
  expect(skipped).toEqual({
    ...initialEpisodeFinalSessionState,
    questionIndex: 2,
    results: ["incorrect"],
  });

  // 다른 문항의 판정 중에 늦게 온 완료는 무시합니다.
  const judged = episodeFinalSessionReducer(initialEpisodeFinalSessionState, {
    type: "choose",
    optionIndex: 0,
    result: "correct",
  });
  expect(episodeFinalSessionReducer(judged, { type: "written", result: "correct" })).toBe(judged);
});

describe("낱말 고르기", () => {
  test("[EF6] 정답 자리를 고르면 정답이다", () => {
    expect(judgeWordChoice(question, 1)).toBe("correct");
    expect(judgeWordChoice(question, 2)).toBe("incorrect");
  });

  test("[EF7] 고르기 전에는 모두 idle, 틀리게 고르면 고른 보기가 incorrect이고 정답 보기가 correct다", () => {
    expect([0, 1, 2].map((index) => episodeFinalOptionState(question, null, index))).toEqual([
      "idle",
      "idle",
      "idle",
    ]);
    expect([0, 1, 2].map((index) => episodeFinalOptionState(question, 0, index))).toEqual([
      "incorrect",
      "correct",
      "idle",
    ]);
    expect([0, 1, 2].map((index) => episodeFinalOptionState(question, 1, index))).toEqual([
      "idle",
      "correct",
      "idle",
    ]);
  });

  test("[EF8] 보조기술은 빈칸을 「빈칸」으로 읽고, 고른 뒤에는 완성된 문장을 읽는다", () => {
    expect(episodeFinalPromptLabel(question)).toBe("이 화장품 찾아 빈칸 .");
    expect(episodeFinalPromptLabel(question, true)).toBe("이 화장품 찾아주세요.");
  });

  test("[EF11] 고르기 전에는 빈칸이 비어 있고, 고른 뒤에는 정답으로 채워진다", () => {
    expect(episodeFinalPromptLine(question, false)).toBe("이 화장품 찾아_ _ _.");
    expect(episodeFinalPromptLine(question, true)).toBe("이 화장품 찾아주세요.");
  });
});

test("[EF9] 진행 라벨은 1부터 센다", () => {
  expect(episodeFinalProgressLabel(0, 5)).toBe("1 / 5");
});

test("[EF10] 튜토리얼 최종 테스트는 말하기 · 낱말 고르기 · 쓰기를 섞고, 정답 자리가 보기 안에 있다", () => {
  const test = episodeFinalTestFor("tutorial-final-test");
  if (test.format !== "visual-novel") {
    throw new Error("튜토리얼 최종 테스트는 비주얼 노벨 형식이어야 합니다");
  }
  const { questions } = test;
  const kinds = new Set(questions.map((item) => item.kind));
  expect(kinds).toEqual(new Set(["speaking", "word-choice", "writing"]));
  for (const item of questions) {
    if (item.kind === "word-choice") {
      expect(item.options[item.answerIndex]).toBeDefined();
    }
    // 쓰기의 칸 하나는 한 음절입니다 — 두 글자를 한 판에 두면 견주기 지표의 뜻이 흐려집니다.
    if (item.kind === "writing") {
      for (const syllable of item.syllables) {
        expect([...syllable]).toHaveLength(1);
      }
    }
  }
});

test("[EF13] 통화의 말풍선은 지금 차례까지의 마지막 상대 대사를 든다", () => {
  const turns = [
    { kind: "line", id: "l1", text: "여보세요?", translation: "Hello?" },
    { kind: "speaking", id: "s1", sentence: "안녕하세요", romanization: "[an.nyeong.ha.se.yo]" },
    { kind: "line", id: "l2", text: "잘 지냈어?", translation: "How have you been?" },
  ] as const;
  expect(latestCallLine(turns, 0)?.id).toBe("l1");
  expect(latestCallLine(turns, 1)?.id).toBe("l1");
  expect(latestCallLine(turns, 2)?.id).toBe("l2");
  expect(latestCallLine([turns[1]], 0)).toBeUndefined();
});
