import { describe, expect, it } from "vitest";

import type { AnswerResult } from "../../lib/answer-result";
import { uiCopyEn } from "../../lib/ui-copy-en";
import type {
  PairLink,
  PairMatchQuestion,
  PairMatchSessionAction,
  PairMatchSessionState,
  PairSide,
  PairTileMark,
} from "./pair-match.contract";
import {
  canCheckPairs,
  initialPairMatchSessionState,
  isPairMatchSessionComplete,
  judgePairLink,
  judgePairMatch,
  pairLinkOf,
  pairMatchMissedPairs,
  pairMatchResultAt,
  pairMatchRevealText,
  pairMatchSessionReducer,
  pairMatchSessionResults,
  pairMatchTransitionAnnouncement,
  pairTileAccessibilityLabel,
  pairTileMarkOf,
  pairTileResultAt,
} from "./pair-match";

// `unit` 계층: 짝 맞추기의 리듀서 · 판정 · 낭독 문자열만 봅니다. DOM · 컴포넌트를 import하지 않습니다.

// 낱말 가·나·다의 뜻은 a·b·c이고 뜻 열은 c·a·b 순서로 섞여 있습니다.
const q: PairMatchQuestion = {
  words: ["가", "나", "다"],
  meanings: ["c", "a", "b"],
  answer: [1, 2, 0],
};

const tap = (side: PairSide, index: number): PairMatchSessionAction => ({
  type: "tapTile",
  side,
  index,
});
const link = (word: number, meaning: number, ordinal = 1): PairLink => ({ word, meaning, ordinal });

function run(
  actions: readonly PairMatchSessionAction[],
  from: PairMatchSessionState = initialPairMatchSessionState,
): PairMatchSessionState {
  return actions.reduce(pairMatchSessionReducer, from);
}

/** 짝이 이미 맺혀 있고 선택은 없는 맞추는 중의 상태입니다. */
const matchingWith = (links: readonly PairLink[]): PairMatchSessionState => ({
  ...initialPairMatchSessionState,
  links,
});

const rightLinks = [link(0, 1, 1), link(1, 2, 2), link(2, 0, 3)];
// 가는 맞고 나 · 다는 틀립니다.
const mixedLinks = [link(0, 1, 1), link(1, 0, 2), link(2, 2, 3)];

const checkedWith = (links: readonly PairLink[], questionIndex = 0): PairMatchSessionState => ({
  ...initialPairMatchSessionState,
  questionIndex,
  links,
  phase: "checked",
  submitted: [links],
});

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

describe("pairMatchSessionReducer — 맺기", () => {
  it("PM1. 낱말을 고르고 뜻을 고르면 번호 1의 짝이 맺히고 두 선택이 비워진다", () => {
    const afterWord = run([tap("word", 0)]);
    const afterMeaning = run([tap("meaning", 1)], afterWord);

    expect(afterWord.selectedWord).toBe(0);
    expect(afterMeaning.links).toEqual([{ word: 0, meaning: 1, ordinal: 1 }]);
    expect(afterMeaning.selectedWord).toBeNull();
    expect(afterMeaning.selectedMeaning).toBeNull();
  });

  it("PM2. 뜻을 먼저 눌러도 같은 짝이 맺힌다", () => {
    const state = run([tap("meaning", 1), tap("word", 0)]);

    expect(state.links).toEqual([{ word: 0, meaning: 1, ordinal: 1 }]);
  });

  it("PM3. 같은 쪽을 다시 누르면 갈아치우거나(다른 타일) 고름이 취소된다(같은 타일)", () => {
    const replaced = run([tap("word", 0), tap("word", 2)]);
    const cancelled = run([tap("word", 0), tap("word", 0)]);

    expect(replaced.selectedWord).toBe(2);
    expect(replaced.links).toEqual([]);
    expect(cancelled.selectedWord).toBeNull();
  });

  it("PM4. 맺힌 타일을 누르면 어느 쪽이든 그 짝이 풀린다", () => {
    expect(run([tap("word", 0)], matchingWith([link(0, 1)])).links).toEqual([]);
    expect(run([tap("meaning", 1)], matchingWith([link(0, 1)])).links).toEqual([]);
  });

  it("PM5. 짝을 풀어도 골라 둔 반대쪽 선택은 남고 다시 누르면 이어진다", () => {
    const picked = run([tap("word", 1)], matchingWith([link(0, 1)]));
    const unlinked = run([tap("meaning", 1)], picked);
    const relinked = run([tap("meaning", 1)], unlinked);

    expect(unlinked.links).toEqual([]);
    expect(unlinked.selectedWord).toBe(1);
    expect(relinked.links).toEqual([{ word: 1, meaning: 1, ordinal: 1 }]);
  });

  it("PM6. 짝 번호는 맺을 때 비어 있는 가장 작은 수이고 풀릴 때까지 바뀌지 않는다", () => {
    const three = run([
      tap("word", 0),
      tap("meaning", 0),
      tap("word", 1),
      tap("meaning", 1),
      tap("word", 2),
      tap("meaning", 2),
    ]);
    const withoutSecond = run([tap("word", 1)], three);
    const refilled = run([tap("word", 1), tap("meaning", 1)], withoutSecond);
    const cleared = run([tap("word", 0), tap("word", 1), tap("word", 2)], refilled);
    const restarted = run([tap("word", 2), tap("meaning", 2)], cleared);

    expect(three.links.map((entry) => entry.ordinal)).toEqual([1, 2, 3]);
    expect(withoutSecond.links.map((entry) => entry.ordinal)).toEqual([1, 3]);
    expect(refilled.links.find((entry) => entry.word === 1)?.ordinal).toBe(2);
    expect(refilled.links.map((entry) => entry.ordinal).sort()).toEqual([1, 2, 3]);
    expect(cleared.links).toEqual([]);
    expect(restarted.links[0]?.ordinal).toBe(1);
  });

  it("PM7. 정수가 아니거나 음수인 인덱스의 탭은 같은 참조를 돌려준다", () => {
    const state = initialPairMatchSessionState;

    expect(pairMatchSessionReducer(state, tap("word", -1))).toBe(state);
    expect(pairMatchSessionReducer(state, tap("meaning", 1.5))).toBe(state);
  });
});

describe("pairMatchSessionReducer — 확인과 다음 문항", () => {
  it("PM8. 모두 맺었을 때만 확인되어 checked가 되고 제출 짝이 쌓인다", () => {
    const partial = matchingWith([link(0, 1, 1), link(1, 2, 2)]);
    const full = matchingWith(rightLinks);

    expect(pairMatchSessionReducer(partial, { type: "check", pairCount: 3 })).toBe(partial);
    const checked = pairMatchSessionReducer(full, { type: "check", pairCount: 3 });
    expect(checked.phase).toBe("checked");
    expect(checked.submitted).toHaveLength(1);
    expect(checked.submitted[0]).toEqual(rightLinks);
    expect(checked.selectedWord).toBeNull();
    expect(checked.selectedMeaning).toBeNull();
  });

  it("PM9. 확인 뒤에는 탭 · 확인이 무시되고 nextQuestion만 다음 문항으로 간다", () => {
    const checked = checkedWith(rightLinks);

    expect(pairMatchSessionReducer(checked, tap("word", 0))).toBe(checked);
    expect(pairMatchSessionReducer(checked, { type: "check", pairCount: 3 })).toBe(checked);
    const next = pairMatchSessionReducer(checked, { type: "nextQuestion" });
    expect(next.questionIndex).toBe(1);
    expect(next.links).toEqual([]);
    expect(next.phase).toBe("matching");
    expect(next.submitted).toEqual([rightLinks]);
    const matching = matchingWith([link(0, 1)]);
    expect(pairMatchSessionReducer(matching, { type: "nextQuestion" })).toBe(matching);
  });
});

describe("판정", () => {
  it.each([
    ["맞는 짝", link(0, 1), "correct"],
    ["틀린 뜻", link(0, 0), "incorrect"],
    ["없는 뜻 자리", link(0, 9), "incorrect"],
    ["없는 낱말 자리", link(9, 0), "incorrect"],
  ] as const)("PM10. judgePairLink — %s", (_name, pair, expected) => {
    expect(judgePairLink(q, pair)).toBe(expected);
  });

  it.each([
    ["정답 짝 셋", rightLinks, "correct"],
    ["둘이 뒤바뀜", [link(0, 2), link(1, 1), link(2, 0)], "incorrect"],
    ["짝 둘뿐", [link(0, 1), link(1, 2)], "incorrect"],
    ["짝 없음", [], "incorrect"],
  ] as const)("PM11. judgePairMatch — %s", (_name, links, expected) => {
    expect(judgePairMatch(q, links)).toBe(expected);
  });

  it("PM12. 같은 뜻이 둘인 문항은 인덱스가 아니라 뜻 글자로 판정한다", () => {
    const sameMeaning: PairMatchQuestion = {
      words: ["가", "나"],
      meanings: ["x", "x"],
      answer: [0, 1],
    };

    expect(judgePairMatch(sameMeaning, [link(0, 1, 1), link(1, 0, 2)])).toBe("correct");
  });
});

describe("파생 값", () => {
  it("PM13. 짝 조회와 타일 표식 — 맺힘 · 고름 · 그 밖", () => {
    const state: PairMatchSessionState = {
      ...matchingWith([link(2, 0, 1)]),
      selectedWord: 1,
    };

    expect(pairLinkOf(state.links, "word", 2)).toEqual(link(2, 0, 1));
    expect(pairLinkOf(state.links, "meaning", 0)).toEqual(link(2, 0, 1));
    expect(pairLinkOf(state.links, "word", 0)).toBeNull();
    expect(pairLinkOf(state.links, "meaning", 2)).toBeNull();
    expect(pairTileMarkOf(state, "word", 2)).toBe("linked");
    expect(pairTileMarkOf(state, "meaning", 0)).toBe("linked");
    expect(pairTileMarkOf(state, "word", 1)).toBe("selected");
    expect(pairTileMarkOf(state, "word", 0)).toBe("idle");
    expect(pairTileMarkOf(state, "meaning", 1)).toBe("idle");
  });

  it("PM14. 확인은 맞추는 중이고 모든 낱말이 맺혔을 때만 된다", () => {
    expect(canCheckPairs(q, matchingWith([]))).toBe(false);
    expect(canCheckPairs(q, matchingWith([link(0, 1, 1), link(1, 2, 2)]))).toBe(false);
    expect(canCheckPairs(q, matchingWith(rightLinks))).toBe(true);
    expect(canCheckPairs(q, checkedWith(rightLinks))).toBe(false);
  });

  it("PM15. 문항 결과와 타일 결과는 확인 뒤에만 있다", () => {
    const checked = checkedWith(mixedLinks);
    const matching = matchingWith(mixedLinks);
    const tiles = (state: PairMatchSessionState) =>
      (
        [
          ["word", 0],
          ["meaning", 1],
          ["word", 1],
          ["meaning", 0],
        ] as const
      ).map(([side, index]) => pairTileResultAt(q, state, side, index));

    expect(pairMatchResultAt(q, matching)).toBeNull();
    expect(pairMatchResultAt(q, checked)).toBe<AnswerResult>("incorrect");
    expect(tiles(checked)).toEqual<(AnswerResult | null)[]>([
      "correct",
      "correct",
      "incorrect",
      "incorrect",
    ]);
    expect(tiles(matching)).toEqual([null, null, null, null]);
  });

  it("PM16. 틀린 짝의 정답만 낱말 열 순서로 모으고 공개 글자는 줄바꿈으로 잇는다", () => {
    expect(pairMatchMissedPairs(q, rightLinks)).toEqual([]);
    expect(pairMatchRevealText(q, rightLinks, uiCopyEn)).toBeNull();
    expect(pairMatchMissedPairs(q, mixedLinks)).toEqual([
      { word: "나", meaning: "b" },
      { word: "다", meaning: "c" },
    ]);
    expect(pairMatchRevealText(q, mixedLinks, uiCopyEn)).toBe("나 = b\n다 = c");
    expect(pairMatchMissedPairs(q, [])).toEqual([
      { word: "가", meaning: "a" },
      { word: "나", meaning: "b" },
      { word: "다", meaning: "c" },
    ]);
    expect(pairMatchRevealText(q, [], uiCopyEn)).toBe("가 = a\n나 = b\n다 = c");
  });

  it("PM17. 문항마다 한 건씩 판정하고 이력이 짧으면 짧은 쪽까지이며 끝은 문항 수로 안다", () => {
    expect(pairMatchSessionResults([q, q], [rightLinks, mixedLinks])).toEqual([
      "correct",
      "incorrect",
    ]);
    expect(pairMatchSessionResults([q, q], [rightLinks])).toEqual(["correct"]);
    expect(
      isPairMatchSessionComplete({ ...initialPairMatchSessionState, questionIndex: 1 }, 2),
    ).toBe(false);
    expect(
      isPairMatchSessionComplete({ ...initialPairMatchSessionState, questionIndex: 2 }, 2),
    ).toBe(true);
  });
});

describe("낭독 문자열", () => {
  it("PM-A1. 타일 낭독은 표식 · 번호 · 판정을 따른다", () => {
    const label = (
      mark: PairTileMark,
      partner: string | null,
      ordinal: number | null,
      result: AnswerResult | null,
    ) => pairTileAccessibilityLabel("이름", mark, partner, ordinal, result, uiCopyEn);

    expect(label("idle", null, null, null)).toBe("이름");
    expect(label("selected", null, null, null)).toBe("이름, selected");
    expect(label("linked", "name", 1, null)).toBe("이름, pair 1, matched with name");
    expect(label("linked", "name", 1, "correct")).toBe(
      `이름, matched with name, ${uiCopyEn.common.answerResultSuffix.correct}`,
    );
    expect(label("linked", "name", 1, "incorrect")).toBe(
      `이름, matched with name, ${uiCopyEn.common.answerResultSuffix.incorrect}`,
    );
    expect(label("linked", null, null, null)).toBe("이름");
  });

  it("PM-A2. 상태 전이의 능동 낭독 — 이음 · 풀림 · 판정 · 없음", () => {
    const announce = (previous: PairMatchSessionState, current: PairMatchSessionState) =>
      pairMatchTransitionAnnouncement(q, previous, current, uiCopyEn);
    const allLinked = matchingWith(rightLinks);

    expect(announce(matchingWith([]), matchingWith([link(0, 1)]))).toBe("Matched: 가, a. 1 of 3.");
    expect(announce(matchingWith([link(0, 1)]), matchingWith([]))).toBe("Unmatched: 가");
    expect(announce(matchingWith([]), { ...matchingWith([]), selectedWord: 0 })).toBeNull();
    expect(announce(allLinked, checkedWith(rightLinks))).toBe(
      uiCopyEn.common.resultAnnouncement("correct"),
    );
    expect(announce(matchingWith(mixedLinks), checkedWith(mixedLinks))).toBe(
      `${uiCopyEn.common.resultAnnouncement("incorrect")} Correct pairs: 나, b. 다, c.`,
    );
    expect(
      announce(
        checkedWith(rightLinks),
        pairMatchSessionReducer(checkedWith(rightLinks), { type: "nextQuestion" }),
      ),
    ).toBeNull();
  });

  it("PM-A3. 동결한 입력으로 불러도 던지지 않고 같은 입력이면 같은 결과다", () => {
    const frozenQuestion = deepFreeze(structuredClone(q));
    const frozenState = deepFreeze(structuredClone(checkedWith(mixedLinks)));
    const actions = [tap("word", 0), tap("meaning", 1), { type: "check", pairCount: 3 }] as const;

    const first = run(actions, deepFreeze(structuredClone(matchingWith([]))));
    const second = run(actions, deepFreeze(structuredClone(matchingWith([]))));

    expect(second).toEqual(first);
    expect(pairMatchRevealText(frozenQuestion, frozenState.links, uiCopyEn)).toBe(
      pairMatchRevealText(frozenQuestion, frozenState.links, uiCopyEn),
    );
    expect(() =>
      pairMatchTransitionAnnouncement(frozenQuestion, matchingWith([]), frozenState, uiCopyEn),
    ).not.toThrow();
    expect(frozenQuestion).toEqual(q);
  });
});
