import { describe, expect, test } from "vitest";

import { correctionSegmentsOf } from "./correction-segments";

// `unit` 계층(MC2-U14): 교정 범위(코드 포인트 [start, end)) → 강조 조각(messenger-chat-1-5 spec §4.3).

const same = (text: string) => ({ text, kind: "same" as const });
const changed = (text: string) => ({ text, kind: "changed" as const });
const joined = (segments: readonly { text: string }[]): string =>
  segments.map((segment) => segment.text).join("");

const SENTENCE = "저는 주말에 카페에 갔어요.";
// 코드 포인트: 저(0) 는(1) ' '(2) 주(3) 말(4) 에(5) ' '(6) 카(7) 페(8) 에(9) ' '(10) 갔(11) …

describe("correctionSegmentsOf (MC2-U14)", () => {
  test("MC2-U14. 두 범위 → same · changed 가 번갈아 나온다", () => {
    expect(
      correctionSegmentsOf(SENTENCE, [
        { start: 1, end: 2 },
        { start: 9, end: 10 },
      ]),
    ).toEqual([same("저"), changed("는"), same(" 주말에 카페"), changed("에"), same(" 갔어요.")]);
  });

  test("MC2-U14. 이어 붙이면 원문이 된다", () => {
    const segments = correctionSegmentsOf(SENTENCE, [
      { start: 1, end: 2 },
      { start: 9, end: 10 },
    ]);
    expect(joined(segments)).toBe(SENTENCE);
  });

  test("MC2-U14. 범위가 0개면 한 조각 same 이다", () => {
    expect(correctionSegmentsOf(SENTENCE, [])).toEqual([same(SENTENCE)]);
  });

  test("MC2-U14. 빈 문장은 조각이 없다", () => {
    expect(correctionSegmentsOf("", [])).toEqual([]);
    expect(correctionSegmentsOf("", [{ start: 0, end: 3 }])).toEqual([]);
  });

  test("MC2-U14. 겹치는 범위는 합친다", () => {
    expect(
      correctionSegmentsOf("가나다라마", [
        { start: 0, end: 3 },
        { start: 2, end: 4 },
      ]),
    ).toEqual([changed("가나다라"), same("마")]);
  });

  test("MC2-U14. 맞닿는 범위도 합친다 — changed 조각이 둘로 쪼개지지 않는다", () => {
    expect(
      correctionSegmentsOf("가나다라마", [
        { start: 0, end: 2 },
        { start: 2, end: 3 },
      ]),
    ).toEqual([changed("가나다"), same("라마")]);
  });

  test("MC2-U14. 순서가 뒤섞여 들어와도 정렬한다", () => {
    expect(
      correctionSegmentsOf("가나다라마", [
        { start: 3, end: 4 },
        { start: 0, end: 1 },
      ]),
    ).toEqual([changed("가"), same("나다"), changed("라"), same("마")]);
  });

  test("MC2-U14. 범위가 문장 밖으로 나가면 [0, 길이]로 자른다", () => {
    expect(correctionSegmentsOf("가나다", [{ start: 1, end: 99 }])).toEqual([
      same("가"),
      changed("나다"),
    ]);
    expect(correctionSegmentsOf("가나다", [{ start: -5, end: 1 }])).toEqual([
      changed("가"),
      same("나다"),
    ]);
  });

  test("MC2-U14. 문장 밖에만 걸친 범위는 버려진다", () => {
    expect(correctionSegmentsOf("가나다", [{ start: 7, end: 9 }])).toEqual([same("가나다")]);
  });

  test("MC2-U14. start ≥ end 인 범위는 버린다", () => {
    expect(
      correctionSegmentsOf("가나다", [
        { start: 2, end: 2 },
        { start: 2, end: 1 },
      ]),
    ).toEqual([same("가나다")]);
  });

  test("MC2-U14. 유한하지 않은 값(NaN · Infinity)이 든 범위는 버린다", () => {
    expect(
      correctionSegmentsOf("가나다", [
        { start: Number.NaN, end: 2 },
        { start: 0, end: Number.NaN },
        { start: 0, end: Number.POSITIVE_INFINITY },
      ]),
    ).toEqual([same("가나다")]);
  });

  test("MC2-U14. 범위 전체가 문장이면 한 조각 changed 다", () => {
    expect(correctionSegmentsOf("가나다", [{ start: 0, end: 3 }])).toEqual([changed("가나다")]);
  });

  test("MC2-U14. 이모지는 코드 포인트 하나로 센다(서로게이트 쌍을 쪼개지 않는다)", () => {
    const text = "a😀b";
    expect(correctionSegmentsOf(text, [{ start: 1, end: 2 }])).toEqual([
      same("a"),
      changed("😀"),
      same("b"),
    ]);
  });

  test("MC2-U14. 겹받침 글자도 코드 포인트 하나다", () => {
    expect(correctionSegmentsOf("읽어요", [{ start: 0, end: 1 }])).toEqual([
      changed("읽"),
      same("어요"),
    ]);
  });

  test("MC2-U14. 빈 조각이 없다 — 어떤 입력이든", () => {
    const inputs: readonly (readonly [string, readonly { start: number; end: number }[]])[] = [
      [SENTENCE, [{ start: 0, end: 1 }]],
      [SENTENCE, [{ start: 0, end: 99 }]],
      [
        "가나",
        [
          { start: 1, end: 2 },
          { start: 0, end: 1 },
        ],
      ],
    ];
    for (const [text, changes] of inputs) {
      for (const segment of correctionSegmentsOf(text, changes)) {
        expect(segment.text).not.toBe("");
      }
    }
  });
});
