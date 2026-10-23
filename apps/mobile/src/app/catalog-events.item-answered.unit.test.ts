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
