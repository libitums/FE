import { describe, expect, it } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import type { SyllableBuildQuestion, SyllableBuildSessionState } from "./syllable-build.contract";
import {
  canCheckSyllableBuild,
  canPlaceSyllableTile,
  composedWord,
  initialSyllableBuildSessionState,
  isSyllableBuildSessionComplete,
  judgeSyllableBuild,
  syllableBuildCompletionAnnouncement,
  syllableBuildResultAt,
  syllableBuildSessionReducer,
  syllableBuildSessionResults,
  syllableBuildWordAccessibilityOf,
  syllableTileAccessibilityLabel,
} from "./syllable-build";

// `unit` 계층: 음절 조립의 리듀서 · 문자열 판정 · 파생 · 낭독 문구만 봅니다(순수 함수).

const copy = uiCopyEn.syllableBuild;

// 타일: 0 현 · 1 드 · 2 카 · 3 찮 — 정답 `카드`는 [2, 1]입니다.
const card: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
};
// 타일: 0 일 · 1 이 · 2 주 · 3 여 · 4 일 — 정답 `일주일`은 [0, 2, 4] 또는 [4, 2, 0]입니다.
const week: SyllableBuildQuestion = {
  meaning: "a week",
  tiles: ["일", "이", "주", "여", "일"],
  slotCount: 3,
  answers: ["일주일"],
};

const stateOf = (
  placed: readonly number[],
  overrides: Partial<SyllableBuildSessionState> = {},
): SyllableBuildSessionState => ({
  ...initialSyllableBuildSessionState,
  placedTileIndexes: placed,
  ...overrides,
});
const toggle = (state: SyllableBuildSessionState, tileIndex: number, slotCount = 2) =>
  syllableBuildSessionReducer(state, { type: "toggleTile", tileIndex, slotCount });

describe("syllableBuildSessionReducer — 놓기 · 되돌리기", () => {
  it("SB1. 창고 타일을 누를 때마다 다음 빈 칸에 붙는다(배열 순서 = 칸 순서)", () => {
    const first = toggle(initialSyllableBuildSessionState, 2);
    const second = toggle(first, 1);

    expect(first.placedTileIndexes).toEqual([2]);
    expect(second.placedTileIndexes).toEqual([2, 1]);
    expect(first).not.toBe(initialSyllableBuildSessionState);
  });

  it("SB2. 놓인 타일을 누르면 빠지고 뒤의 타일이 앞 칸으로 당겨진다", () => {
    expect(toggle(stateOf([2, 1]), 2).placedTileIndexes).toEqual([1]);
    expect(toggle(stateOf([2, 1]), 1).placedTileIndexes).toEqual([2]);
  });

  it("SB3. 칸이 차면 새 타일은 같은 참조로 흡수하고 놓인 타일은 빠진다", () => {
    const full = stateOf([2, 1]);

    expect(toggle(full, 0)).toBe(full);
    expect(toggle(full, 1).placedTileIndexes).toEqual([2]);
  });

  it("SB3. 칸 수는 액션이 싣고 온다 — 칸이 셋이면 셋째 타일까지 붙는다", () => {
    const two = stateOf([0, 2]);

    expect(toggle(two, 4, 3).placedTileIndexes).toEqual([0, 2, 4]);
    expect(toggle(two, 4, 2)).toBe(two);
  });
});

describe("syllableBuildSessionReducer — 확인 · 다음", () => {
  it("SB4. checked에서는 toggleTile · check가 같은 참조다", () => {
    const checked = stateOf([2, 1], { phase: "checked", submittedTileIndexes: [[2, 1]] });

    expect(toggle(checked, 0)).toBe(checked);
    expect(toggle(checked, 2)).toBe(checked);
    expect(syllableBuildSessionReducer(checked, { type: "check" })).toBe(checked);
    // 같은 배치라도 building이면 전이가 일어난다 — 흡수가 phase 때문임을 가른다.
    expect(toggle({ ...checked, phase: "building" }, 0).placedTileIndexes).toEqual([2, 1]);
    expect(toggle({ ...checked, phase: "building" }, 2).placedTileIndexes).toEqual([1]);
  });

  it("SB4. building에서 nextQuestion은 같은 참조다", () => {
    const building = stateOf([2]);

    expect(syllableBuildSessionReducer(building, { type: "nextQuestion" })).toBe(building);
    expect(
      syllableBuildSessionReducer({ ...building, phase: "checked" }, { type: "nextQuestion" })
        .questionIndex,
    ).toBe(1);
  });

  it("SB5. check는 지금 배치를 이력에 더하고 checked로 간다(덜 찬 배치도 그대로)", () => {
    const checked = syllableBuildSessionReducer(stateOf([2, 1]), { type: "check" });
    const partial = syllableBuildSessionReducer(stateOf([2]), { type: "check" });

    expect(checked.phase).toBe("checked");
    expect(checked.submittedTileIndexes).toEqual([[2, 1]]);
    expect(checked.placedTileIndexes).toEqual([2, 1]);
    expect(partial.submittedTileIndexes).toEqual([[2]]);
  });

  it("SB5. nextQuestion은 문항 번호를 올리고 배치를 비우며 이력은 남긴다", () => {
    const checked = stateOf([2, 1], { phase: "checked", submittedTileIndexes: [[2, 1]] });

    const next = syllableBuildSessionReducer(checked, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 1,
      placedTileIndexes: [],
      phase: "building",
      submittedTileIndexes: [[2, 1]],
    });
  });

  it("SB5. 입력 상태는 바뀌지 않는다", () => {
    const state = stateOf([2, 1]);
    const snapshot = structuredClone(state);

    toggle(state, 1);
    syllableBuildSessionReducer(state, { type: "check" });

    expect(state).toEqual(snapshot);
  });
});

describe("판정 — 낱말 문자열 (SB6 · SB7)", () => {
  it("SB6. 정답 낱말이면 correct, 순서가 바뀌거나 오답 음절이 섞이면 incorrect다", () => {
    expect(judgeSyllableBuild(card, [2, 1])).toBe("correct");
    expect(judgeSyllableBuild(card, [1, 2])).toBe("incorrect");
    expect(judgeSyllableBuild(card, [2, 3])).toBe("incorrect");
  });

  it("SB6. 짧거나 빈 배치도 던지지 않고 incorrect다", () => {
    expect(judgeSyllableBuild(card, [2])).toBe("incorrect");
    expect(judgeSyllableBuild(card, [])).toBe("incorrect");
  });

  it("SB6. composedWord는 놓인 글자를 띄어쓰기 없이 잇고 범위 밖 인덱스는 빈 글자다", () => {
    expect(composedWord(card, [2, 1])).toBe("카드");
    expect(composedWord(card, [1, 2])).toBe("드카");
    expect(composedWord(card, [])).toBe("");
    expect(composedWord(card, [2, 9, 1])).toBe("카드");
  });

  it("SB7. 같은 음절 두 장은 어느 장을 먼저 놓아도 정답이다(인덱스가 아니라 문자열 판정)", () => {
    expect(judgeSyllableBuild(week, [0, 2, 4])).toBe("correct");
    expect(judgeSyllableBuild(week, [4, 2, 0])).toBe("correct");
    expect(judgeSyllableBuild(week, [0, 2, 1])).toBe("incorrect");
  });

  it("SB7. 정답이 둘이면 어느 쪽이든 correct다", () => {
    const two: SyllableBuildQuestion = {
      meaning: "card",
      tiles: ["카", "아", "드", "찮"],
      slotCount: 2,
      answers: ["카드", "카아드"],
    };

    expect(judgeSyllableBuild(two, [0, 2])).toBe("correct");
    expect(judgeSyllableBuild(two, [0, 1, 2])).toBe("correct");
    expect(judgeSyllableBuild(two, [2, 0])).toBe("incorrect");
  });
});

describe("파생 (SB8)", () => {
  it("SB8. canPlaceSyllableTile은 building이고 놓인 수가 칸 수보다 적을 때만 참이다", () => {
    expect(canPlaceSyllableTile(card, stateOf([]))).toBe(true);
    expect(canPlaceSyllableTile(card, stateOf([2]))).toBe(true);
    expect(canPlaceSyllableTile(card, stateOf([2, 1]))).toBe(false);
    expect(canPlaceSyllableTile(card, stateOf([2], { phase: "checked" }))).toBe(false);
  });

  it("SB8. canCheckSyllableBuild는 building이고 칸이 다 찼을 때만 참이다", () => {
    expect(canCheckSyllableBuild(card, stateOf([]))).toBe(false);
    expect(canCheckSyllableBuild(card, stateOf([2]))).toBe(false);
    expect(canCheckSyllableBuild(card, stateOf([2, 1]))).toBe(true);
    expect(canCheckSyllableBuild(card, stateOf([2, 1], { phase: "checked" }))).toBe(false);
  });

  it("SB8. syllableBuildResultAt은 checked일 때만 판정하고 그 전에는 null이다", () => {
    expect(syllableBuildResultAt(card, stateOf([2, 1]))).toBeNull();
    expect(syllableBuildResultAt(card, stateOf([2, 1], { phase: "checked" }))).toBe("correct");
    expect(syllableBuildResultAt(card, stateOf([1, 2], { phase: "checked" }))).toBe("incorrect");
  });

  it("SB8. isSyllableBuildSessionComplete는 문항 번호가 전체 수에 닿으면 참이다", () => {
    expect(isSyllableBuildSessionComplete(stateOf([], { questionIndex: 1 }), 2)).toBe(false);
    expect(isSyllableBuildSessionComplete(stateOf([], { questionIndex: 2 }), 2)).toBe(true);
  });

  it("SB8. syllableBuildSessionResults는 이력을 문항별로 판정하고 짧은 쪽 길이까지만 낸다", () => {
    expect(
      syllableBuildSessionResults(
        [card, week],
        [
          [2, 1],
          [0, 2, 1],
        ],
      ),
    ).toEqual(["correct", "incorrect"]);
    expect(syllableBuildSessionResults([card, week], [[2, 1]])).toEqual(["correct"]);
    expect(
      syllableBuildSessionResults(
        [card],
        [
          [2, 1],
          [0, 2, 4],
        ],
      ),
    ).toEqual(["correct"]);
    expect(syllableBuildSessionResults([card, week], [])).toEqual([]);
  });
});

describe("낭독 (SB9 · SB10)", () => {
  it("SB9. 창고 타일은 글자 그대로, 놓인 타일은 칸 번호와 전체 칸 수가 붙는다", () => {
    expect(syllableTileAccessibilityLabel("카", null, 2, copy)).toBe("카");
    expect(syllableTileAccessibilityLabel("카", 1, 2, copy)).toBe("카, position 1 of 2");
    expect(syllableTileAccessibilityLabel("드", 2, 2, copy)).toBe("드, position 2 of 2");
    expect(syllableTileAccessibilityLabel("이", 3, 5, copy)).toBe("이, position 3 of 5");
  });

  it("SB10. 빈 줄 낭독은 칸 수를 말하고 1칸이면 단수다", () => {
    expect(copy.wordEmpty(2)).toBe("Your word, empty, 2 syllables");
    expect(copy.wordEmpty(5)).toBe("Your word, empty, 5 syllables");
    expect(copy.wordEmpty(1)).toBe("Your word, empty, 1 syllable");
  });

  it("SB10. 비었으면 줄 하나가 요소(Your word, empty)다", () => {
    expect(syllableBuildWordAccessibilityOf(card, stateOf([]), copy)).toEqual({
      kind: "row",
      label: "Your word, empty, 2 syllables",
    });
  });

  it("SB10. 놓이는 중에는 줄이 요소가 아니고 타일이 각자 요소다", () => {
    expect(syllableBuildWordAccessibilityOf(card, stateOf([2]), copy)).toEqual({ kind: "tiles" });
    expect(syllableBuildWordAccessibilityOf(card, stateOf([2, 1]), copy)).toEqual({
      kind: "tiles",
    });
  });

  it("SB10. 채점 뒤에는 만든 낱말을 읽는 줄 하나가 요소다 — 오답이어도 만든 그대로", () => {
    expect(
      syllableBuildWordAccessibilityOf(card, stateOf([2, 1], { phase: "checked" }), copy),
    ).toEqual({ kind: "row", label: "Your word: 카드" });
    expect(
      syllableBuildWordAccessibilityOf(card, stateOf([1, 2], { phase: "checked" }), copy),
    ).toEqual({ kind: "row", label: "Your word: 드카" });
  });

  it("SB10. 완료 낭독은 모두 풀었음과 다음 동작 이름을 쉼표로 잇는다", () => {
    expect(syllableBuildCompletionAnnouncement("See results", uiCopyEn)).toBe(
      "All questions done, See results",
    );
  });
});
