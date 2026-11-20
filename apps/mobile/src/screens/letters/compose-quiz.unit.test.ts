import { describe, expect, test } from "vitest";

import {
  COMPOSE_ROUNDS,
  COMPOSE_TILES,
  composeReducer,
  composeSlotStateOf,
  composeVerdictOf,
  initialComposeState,
  type ComposeAction,
  type ComposeState,
} from "./compose-quiz";

// `unit` 계층: 합치기 퀴즈의 라운드 · 칸 · 자동 판정 · Next / Try again(ADR-0168).

const run = (...actions: ComposeAction[]): ComposeState =>
  actions.reduce(composeReducer, initialComposeState);

describe("라운드 · 타일", () => {
  test("CQ1. 가 · 너 · 도 세 라운드", () => {
    expect(COMPOSE_ROUNDS.map((r) => `${r.consonant}${r.vowel}:${r.roman}`)).toEqual([
      "ㄱㅏ:ga",
      "ㄴㅓ:neo",
      "ㄷㅗ:do",
    ]);
  });

  test("CQ2. 타일 여섯 — 보드 순서", () => {
    expect(COMPOSE_TILES).toEqual(["ㅏ", "ㄷ", "ㄱ", "ㅗ", "ㄴ", "ㅓ"]);
  });
});

describe("칸", () => {
  test("CQ3. 처음엔 자음 칸이 지금 칸, 모음 칸은 빈 칸", () => {
    expect(composeSlotStateOf(initialComposeState, "consonant")).toBe("current");
    expect(composeSlotStateOf(initialComposeState, "vowel")).toBe("empty");
  });

  test("CQ4. 모음을 먼저 골라도 모음 칸에 들고, 자음 칸이 여전히 지금 칸", () => {
    const state = run({ type: "pick", letter: "ㅏ" });
    expect(state.vowel).toBe("ㅏ");
    expect(state.consonant).toBeNull();
    expect(composeSlotStateOf(state, "consonant")).toBe("current");
    expect(composeSlotStateOf(state, "vowel")).toBe("filled");
  });

  test("CQ5. 자음을 고르면 모음 칸이 지금 칸", () => {
    const state = run({ type: "pick", letter: "ㄱ" });
    expect(composeSlotStateOf(state, "consonant")).toBe("filled");
    expect(composeSlotStateOf(state, "vowel")).toBe("current");
  });

  test("CQ6. 판정 전에는 칸을 눌러 비울 수 있다", () => {
    const state = run({ type: "pick", letter: "ㄱ" }, { type: "clear", slot: "consonant" });
    expect(state.consonant).toBeNull();
  });
});

describe("판정", () => {
  test("CQ7. 두 칸이 차기 전엔 판정 없음", () => {
    expect(composeVerdictOf(run({ type: "pick", letter: "ㄱ" }))).toBeNull();
  });

  test("CQ8. 맞으면 correct, 칸이 둘 다 correct", () => {
    const state = run({ type: "pick", letter: "ㄱ" }, { type: "pick", letter: "ㅏ" });
    expect(composeVerdictOf(state)).toBe("correct");
    expect(composeSlotStateOf(state, "consonant")).toBe("correct");
    expect(composeSlotStateOf(state, "vowel")).toBe("correct");
  });

  test("CQ9. 틀리면 incorrect, 칸마다 맞고 틀림", () => {
    const state = run({ type: "pick", letter: "ㄱ" }, { type: "pick", letter: "ㅓ" });
    expect(composeVerdictOf(state)).toBe("incorrect");
    expect(composeSlotStateOf(state, "consonant")).toBe("correct");
    expect(composeSlotStateOf(state, "vowel")).toBe("incorrect");
  });

  test("CQ10. 판정 뒤에는 고르기 · 비우기가 먹지 않는다", () => {
    const judged = run({ type: "pick", letter: "ㄱ" }, { type: "pick", letter: "ㅓ" });
    expect(composeReducer(judged, { type: "pick", letter: "ㅏ" })).toBe(judged);
    expect(composeReducer(judged, { type: "clear", slot: "vowel" })).toBe(judged);
  });

  test("CQ11. Try again은 칸을 비우고 같은 라운드, 이 라운드는 첫 시도 아님", () => {
    const state = run(
      { type: "pick", letter: "ㄱ" },
      { type: "pick", letter: "ㅓ" },
      { type: "retry" },
      { type: "pick", letter: "ㄱ" },
      { type: "pick", letter: "ㅏ" },
      { type: "next" },
    );
    expect(state.round).toBe(1);
    expect(state.firstTry).toBe(0);
    expect(state.consonant).toBeNull();
  });

  test("CQ12. 세 라운드를 다 맞히면 done, 첫 시도 3", () => {
    const state = run(
      { type: "pick", letter: "ㄱ" },
      { type: "pick", letter: "ㅏ" },
      { type: "next" },
      { type: "pick", letter: "ㄴ" },
      { type: "pick", letter: "ㅓ" },
      { type: "next" },
      { type: "pick", letter: "ㄷ" },
      { type: "pick", letter: "ㅗ" },
      { type: "next" },
    );
    expect(state.done).toBe(true);
    expect(state.firstTry).toBe(3);
  });

  test("CQ13. 틀린 판정에서 Next는 먹지 않는다(다음은 맞힌 뒤에만)", () => {
    const judged = run({ type: "pick", letter: "ㄱ" }, { type: "pick", letter: "ㅓ" });
    expect(composeReducer(judged, { type: "next" })).toBe(judged);
  });
});
