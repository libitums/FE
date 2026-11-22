import { describe, expect, test, vi } from "vitest";

import type { ItemAnswerReport } from "../lib/item-answer";
import { itemAnsweredEventOf } from "./catalog-events";
import type { CatalogEntry } from "../lib/episode-catalog";
import { emptyWordbook, isStarredIn, type Wordbook } from "../lib/wordbook";
import { catalogItemReportWiring, itemAnswerContentOf } from "./catalog-item-report-wiring";
import { createLearningTrail } from "./learning-trail";

// `unit` 계층: 문항 판정 보고 결선의 입출력만 봅니다.

const report: ItemAnswerReport = { questionIndex: 0, outcome: "correct", density: "regular" };
const scoredRef = { itemId: "S2-01", itemType: "LISTEN_SELECT" } as const;
const unscoredRef = { itemId: "S1-01", itemType: "VOCAB_CARD" } as const;

describe("catalogItemReportWiring (EV3)", () => {
  test("채점 문항 보고는 sink에 이벤트 하나로 나간다", () => {
    const sink = vi.fn<(event: unknown) => void>();
    const wiring = catalogItemReportWiring({ episodeIntroEventSink: sink });

    wiring.onCatalogItemAnswered("u00-tutorial", "S2", scoredRef, report);

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(itemAnsweredEventOf("u00-tutorial", "S2", scoredRef, report));
    expect(sink).toHaveBeenCalledWith({
      name: "episode_item_answered",
      episodeId: "u00-tutorial",
      unitKey: "S2",
      itemId: "S2-01",
      itemType: "LISTEN_SELECT",
      result: "correct",
      density: "regular",
    });
  });

  test("채점 밖 유형이라 이벤트가 null이면 sink를 부르지 않는다", () => {
    const sink = vi.fn<(event: unknown) => void>();
    const wiring = catalogItemReportWiring({ episodeIntroEventSink: sink });

    wiring.onCatalogItemAnswered("u00-tutorial", "S1", unscoredRef, report);

    expect(sink).not.toHaveBeenCalled();
  });

  test("sink가 null이어도 던지지 않는다", () => {
    const wiring = catalogItemReportWiring({ episodeIntroEventSink: null });

    expect(() =>
      wiring.onCatalogItemAnswered("u00-tutorial", "S2", scoredRef, report),
    ).not.toThrow();
  });
});

describe("itemAnswerContentOf (2026-11-16)", () => {
  const ready = (id: string, source: "bundled" | "cache", level?: number) =>
    ({
      status: "ready",
      id,
      order: 0,
      title: id,
      version: "2026-11-10.3",
      source,
      episode: {},
      warnings: [],
      ...(level === undefined ? {} : { level }),
    }) as unknown as CatalogEntry;

  test("IR1. 저장소(cache) 판은 remote로, 수준이 있으면 함께 낸다", () => {
    expect(itemAnswerContentOf({ catalog: [ready("u01", "cache", 5)] }, "u01")).toEqual({
      version: "2026-11-10.3",
      source: "remote",
      level: 5,
    });
  });

  test("IR2. 내장판은 bundled, 준비 안 된 항목 · 없는 에피소드 · 내용 없음은 undefined다", () => {
    expect(itemAnswerContentOf({ catalog: [ready("u00", "bundled")] }, "u00")).toEqual({
      version: "2026-11-10.3",
      source: "bundled",
    });
    const pending = {
      status: "pending",
      id: "u02",
      order: 2,
      title: "u02",
      version: "x",
    } as CatalogEntry;
    expect(itemAnswerContentOf({ catalog: [pending] }, "u02")).toBeUndefined();
    expect(itemAnswerContentOf({ catalog: [] }, "u09")).toBeUndefined();
    expect(itemAnswerContentOf(undefined, "u00")).toBeUndefined();
  });
});

describe("단어 카드 별(ADR-0169 즐겨찾기 개정)", () => {
  const cards = [
    { itemId: "S1-01", itemType: "VOCAB_CARD", contentRef: "voca:a1" },
    { itemId: "S1-02", itemType: "VOCAB_CARD" },
  ] as const;

  function withTrail() {
    let book: Wordbook = emptyWordbook;
    const trail = createLearningTrail({
      today: () => "2026-11-21",
      updateWordbook: (update) => {
        book = update(book);
      },
      readWordbook: () => book,
    });
    const sink = vi.fn<(event: unknown) => void>();
    const wiring = catalogItemReportWiring({ episodeIntroEventSink: sink, learningTrail: trail });
    return { wiring, sink, book: () => book };
  }

  test("EV-S1. 별을 누르면 단어장에 적고 wordbook_star_toggled(source lesson_card)를 낸다", () => {
    const { wiring, sink, book } = withTrail();
    wiring.onCatalogCardStar("u01", cards[0], true);
    expect(isStarredIn(book(), "u01", "voca:a1")).toBe(true);
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "wordbook_star_toggled",
        starred: true,
        source: "lesson_card",
        surface: "learning",
      }),
    );
    wiring.onCatalogCardStar("u01", cards[0], false);
    expect(isStarredIn(book(), "u01", "voca:a1")).toBe(false);
    expect(sink).toHaveBeenLastCalledWith(expect.objectContaining({ starred: false }));
  });

  test("EV-S2. 카드 별 상태는 ref가 없는 카드에 null, 별을 달 수 없는 카드는 눌러도 아무것도 하지 않는다", () => {
    const { wiring, sink, book } = withTrail();
    expect(wiring.catalogCardStars("u01", cards)).toEqual([false, null]);
    wiring.onCatalogCardStar("u01", cards[1], true);
    expect(book()).toBe(emptyWordbook);
    expect(sink).not.toHaveBeenCalled();
  });
});
