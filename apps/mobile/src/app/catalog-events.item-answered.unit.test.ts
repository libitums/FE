import { describe, expect, test } from "vitest";

import type { ItemAnswerReport } from "../lib/item-answer";
import { itemAnsweredEventOf } from "./catalog-events";

// `unit` 계층: 문항 판정 보고가 측정 이벤트로 바뀌는 입출력만 봅니다.

const report: ItemAnswerReport = { questionIndex: 2, outcome: "incorrect", density: "compact" };

describe("itemAnsweredEventOf (EV2)", () => {
  test("채점 유형은 이름 · 에피소드 · 단계 · 문항 · 유형 · 결과 · 밀도를 싣는다", () => {
    expect(
      itemAnsweredEventOf("u03-mina", "S7", { itemId: "S7-07", itemType: "WORD_ORDER" }, report),
    ).toEqual({
      name: "episode_item_answered",
      episodeId: "u03-mina",
      unitKey: "S7",
      itemId: "S7-07",
      itemType: "WORD_ORDER",
      result: "incorrect",
      density: "compact",
    });
  });

  test("건너뜀은 result skipped로, regular 밀도는 그대로 싣는다", () => {
    expect(
      itemAnsweredEventOf(
        "u00-tutorial",
        "S5",
        { itemId: "S5-01", itemType: "SPEAK_WORD" },
        { questionIndex: 0, outcome: "skipped", density: "regular" },
      ),
    ).toMatchObject({ result: "skipped", density: "regular", itemType: "SPEAK_WORD" });
  });

  test("채점 밖 유형은 null이다", () => {
    expect(
      itemAnsweredEventOf(
        "u00-tutorial",
        "S1",
        { itemId: "S1-01", itemType: "VOCAB_CARD" },
        report,
      ),
    ).toBeNull();
    expect(
      itemAnsweredEventOf("u00-tutorial", "S8", { itemId: "S8-01", itemType: "SHADOW" }, report),
    ).toBeNull();
  });

  test("이벤트 키는 일곱 개뿐이고 문항 번호는 싣지 않는다", () => {
    const event = itemAnsweredEventOf(
      "u03-mina",
      "S7",
      { itemId: "S7-07", itemType: "WORD_ORDER" },
      report,
    );

    expect(Object.keys(event ?? {}).sort()).toEqual(
      ["density", "episodeId", "itemId", "itemType", "name", "result", "unitKey"].sort(),
    );
  });
});

describe("itemAnsweredEventOf — 판 정보 · 고른 글자 · 건너뛴 까닭 (2026-11-16)", () => {
  const ref = { itemId: "S2-02", itemType: "LISTEN_BUILD" } as const;

  test("IE5. 원격 판이면 버전 · 출처 · 수준(10진 문자열)을 싣는다", () => {
    expect(
      itemAnsweredEventOf("u00-tutorial", "S2", ref, report, {
        version: "2026-11-10.3",
        source: "remote",
        level: 5,
      }),
    ).toMatchObject({ contentVersion: "2026-11-10.3", contentSource: "remote", contentLevel: "5" });
  });

  test("IE6. 내장판은 수준 키를 싣지 않고, 판 정보가 없으면 판 키를 하나도 싣지 않는다", () => {
    const bundled = itemAnsweredEventOf("u00-tutorial", "S2", ref, report, {
      version: "2026-11-04.2",
      source: "bundled",
    });
    expect(bundled).toMatchObject({ contentVersion: "2026-11-04.2", contentSource: "bundled" });
    expect(bundled).not.toHaveProperty("contentLevel");
    const none = itemAnsweredEventOf("u00-tutorial", "S2", ref, report);
    expect(none).not.toHaveProperty("contentVersion");
    expect(none).not.toHaveProperty("contentSource");
  });

  test("IE7. 고른 글자를 싣고, 없으면 키가 없다", () => {
    expect(
      itemAnsweredEventOf("u00-tutorial", "S2", ref, {
        ...report,
        selectedAnswer: "안녕하세요! 처음이에요!",
      }),
    ).toMatchObject({ selectedAnswer: "안녕하세요! 처음이에요!" });
    expect(itemAnsweredEventOf("u00-tutorial", "S2", ref, report)).not.toHaveProperty(
      "selectedAnswer",
    );
  });

  test("IE8. 건너뛴 까닭은 skipped일 때만 싣는다", () => {
    const speak = { itemId: "S6-06", itemType: "SPEAK_WORD" } as const;
    expect(
      itemAnsweredEventOf("u01-water", "S6", speak, {
        questionIndex: 0,
        outcome: "skipped",
        density: "regular",
        skipReason: "unavailable:dictation-off",
      }),
    ).toMatchObject({ result: "skipped", skipReason: "unavailable:dictation-off" });
    expect(
      itemAnsweredEventOf("u01-water", "S6", speak, {
        questionIndex: 0,
        outcome: "incorrect",
        density: "regular",
        skipReason: "user",
      }),
    ).not.toHaveProperty("skipReason");
  });
});
