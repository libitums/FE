import { describe, expect, test } from "vitest";

import type { CatalogFinalState, CatalogRoleplayTurn } from "./catalog-final.contract";
import {
  canCheckTurn,
  catalogFinalAudioCueOf,
  catalogFinalLineAccessibilityLabel,
  catalogFinalReducer,
  composedReply,
  initialCatalogFinalState,
  isCatalogFinalComplete,
  judgeRoleplayTurn,
} from "./catalog-final";

// `unit` 계층: 최종 테스트 세션의 상태 전이와 판정의 입출력만 봅니다.

const turn: CatalogRoleplayTurn = {
  id: "RP-01",
  instruction: "What do you say?",
  line: { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "Would you like a bag?" },
  tiles: [
    { ko: "괜찮아요.", roman: "gwaenchanayo." },
    { ko: "아니요,", roman: "aniyo," },
  ],
  accepted: ["아니요, 괜찮아요."],
  replyTranslation: "No, I'm fine.",
  imageUrl: null,
};

describe("catalogFinalReducer", () => {
  test("CF1. 타일을 누르면 끝에 더하고 다시 누르면 뺀다", () => {
    const first = catalogFinalReducer(initialCatalogFinalState, {
      type: "toggleTile",
      tileIndex: 0,
    });
    expect(first.placed).toEqual([0]);

    const second = catalogFinalReducer(first, { type: "toggleTile", tileIndex: 1 });
    expect(second.placed).toEqual([0, 1]);

    const third = catalogFinalReducer(second, { type: "toggleTile", tileIndex: 0 });
    expect(third.placed).toEqual([1]);
    expect(third.phase).toBe("arranging");
  });

  test("CF1. 확인한 뒤에는 타일 누름을 무시한다", () => {
    const checked: CatalogFinalState = {
      turnIndex: 0,
      placed: [1, 0],
      phase: "checked",
      results: ["correct"],
    };

    expect(catalogFinalReducer(checked, { type: "toggleTile", tileIndex: 0 })).toBe(checked);
  });

  test("CF1. 아무것도 놓지 않고 확인하면 상태가 그대로다", () => {
    expect(
      catalogFinalReducer(initialCatalogFinalState, { type: "check", result: "correct" }),
    ).toBe(initialCatalogFinalState);
  });

  test("CF2. 다 놓고 확인하면 checked가 되고 결과가 한 칸 쌓인다", () => {
    const arranged: CatalogFinalState = { ...initialCatalogFinalState, placed: [1, 0] };

    const checked = catalogFinalReducer(arranged, { type: "check", result: "correct" });

    expect(checked.phase).toBe("checked");
    expect(checked.results).toEqual(["correct"]);
    expect(checked.placed).toEqual([1, 0]);
  });

  test("CF2. 다음 턴으로 가면 턴 번호가 오르고 놓은 것이 비며 결과는 남는다", () => {
    const checked: CatalogFinalState = {
      turnIndex: 0,
      placed: [1, 0],
      phase: "checked",
      results: ["incorrect"],
    };

    const next = catalogFinalReducer(checked, { type: "nextTurn" });

    expect(next).toEqual({ turnIndex: 1, placed: [], phase: "arranging", results: ["incorrect"] });
  });

  test("CF2. 확인 전에 다음 턴을 요구하면 상태가 그대로다", () => {
    const arranged: CatalogFinalState = { ...initialCatalogFinalState, placed: [1, 0] };

    expect(catalogFinalReducer(arranged, { type: "nextTurn" })).toBe(arranged);
  });
});

describe("대답 판정", () => {
  test("CF3. 놓은 순서대로 공백을 두고 이어 붙인다", () => {
    expect(composedReply(turn, [1, 0])).toBe("아니요, 괜찮아요.");
    expect(composedReply(turn, [0, 1])).toBe("괜찮아요. 아니요,");
  });

  test("CF3. 정답 순서면 맞고 아니면 틀린다", () => {
    expect(judgeRoleplayTurn(turn, [1, 0])).toBe("correct");
    expect(judgeRoleplayTurn(turn, [0, 1])).toBe("incorrect");
  });

  test("CF3. 문장 부호는 보지 않으므로 마침표 없는 정답도 맞다", () => {
    const noPeriod: CatalogRoleplayTurn = { ...turn, accepted: ["아니요, 괜찮아요"] };

    expect(judgeRoleplayTurn(noPeriod, [1, 0])).toBe("correct");
  });

  test("CF3. 받는 정답이 둘이면 어느 쪽과 같아도 맞다", () => {
    const two: CatalogRoleplayTurn = {
      ...turn,
      accepted: ["괜찮아요. 아니요,", "아니요, 괜찮아요."],
    };

    expect(judgeRoleplayTurn(two, [0, 1])).toBe("correct");
    expect(judgeRoleplayTurn(two, [1, 0])).toBe("correct");
  });

  test.each([
    [[], false],
    [[1], false],
    [[1, 0], true],
  ] as const)("CF4. 놓은 자리 %j → 확인 가능 %s", (placed, expected) => {
    expect(canCheckTurn(turn, placed)).toBe(expected);
  });

  test("CF4. 턴 번호가 전체 턴 수에 닿으면 끝난 것이다", () => {
    expect(isCatalogFinalComplete({ ...initialCatalogFinalState, turnIndex: 3 }, 3)).toBe(true);
    expect(isCatalogFinalComplete({ ...initialCatalogFinalState, turnIndex: 2 }, 3)).toBe(false);
  });
});

describe("상대 대사 낭독", () => {
  test("CF5. 화자 이름 뒤에 한국어와 영어가 이어진다", () => {
    expect(catalogFinalLineAccessibilityLabel(turn, "점원")).toBe(
      "점원: 봉투 드릴까요? Would you like a bag?",
    );
  });

  test("CF5. 영어가 없으면 한국어까지만 읽는다", () => {
    const noEnglish: CatalogRoleplayTurn = { ...turn, line: { ...turn.line, en: null } };

    expect(catalogFinalLineAccessibilityLabel(noEnglish, "점원")).toBe("점원: 봉투 드릴까요?");
  });
});

describe("catalogFinalAudioCueOf", () => {
  const counterpartOnly: CatalogRoleplayTurn = {
    ...turn,
    counterpartAudioSource: "https://cdn/c.m4a",
  };
  const both: CatalogRoleplayTurn = { ...counterpartOnly, replyAudioSource: "https://cdn/r.m4a" };
  const stateOf = (
    phase: CatalogFinalState["phase"],
    turnIndex: number,
    results: CatalogFinalState["results"],
  ): CatalogFinalState => ({ turnIndex, placed: [1, 0], phase, results });
  const arranging = (turnIndex: number): CatalogFinalState => stateOf("arranging", turnIndex, []);
  const checkedAs = (result: "correct" | "incorrect"): CatalogFinalState =>
    stateOf("checked", 0, [result]);

  test("FAC1. arranging이면 상대 줄 소리를 턴 번호 key로 낸다", () => {
    expect(catalogFinalAudioCueOf(both, arranging(0))).toEqual({
      key: "0:counterpart",
      source: "https://cdn/c.m4a",
    });
    expect(catalogFinalAudioCueOf(both, arranging(1))?.key).toBe("1:counterpart");
  });

  test("FAC2. arranging이고 상대 소리가 없으면 null이다", () => {
    expect(catalogFinalAudioCueOf(turn, arranging(0))).toBeNull();
    expect(
      catalogFinalAudioCueOf({ ...turn, replyAudioSource: "https://cdn/r.m4a" }, arranging(0)),
    ).toBeNull();
  });

  test("FAC3. 정답 뒤에는 내 줄 소리를 낸다", () => {
    expect(catalogFinalAudioCueOf(both, checkedAs("correct"))).toEqual({
      key: "0:reply",
      source: "https://cdn/r.m4a",
    });
  });

  test("FAC4. 정답이어도 내 소리가 없으면 arranging과 같은 값이다", () => {
    expect(catalogFinalAudioCueOf(counterpartOnly, checkedAs("correct"))).toEqual(
      catalogFinalAudioCueOf(counterpartOnly, arranging(0)),
    );
    expect(catalogFinalAudioCueOf(turn, checkedAs("correct"))).toBeNull();
  });

  test("FAC5. 오답이면 내 소리가 있어도 arranging과 같은 값이다", () => {
    const cue = catalogFinalAudioCueOf(both, checkedAs("incorrect"));
    expect(cue).toEqual(catalogFinalAudioCueOf(both, arranging(0)));
    expect(cue?.key).toBe("0:counterpart");
  });

  test("FAC6. 리듀서로 밟은 전이의 key 열은 상대 줄 → 내 줄 → 다음 턴 상대 줄이다", () => {
    const placed = catalogFinalReducer(initialCatalogFinalState, {
      type: "toggleTile",
      tileIndex: 0,
    });
    const ready = catalogFinalReducer(placed, { type: "toggleTile", tileIndex: 1 });
    const checked = catalogFinalReducer(ready, { type: "check", result: "correct" });
    const next = catalogFinalReducer(checked, { type: "nextTurn" });

    const keys = [ready, checked, next].map((state) => catalogFinalAudioCueOf(both, state)?.key);
    expect(keys).toEqual(["0:counterpart", "0:reply", "1:counterpart"]);
  });
});
