import { describe, expect, test, vi } from "vitest";

import type { ItemAnswerReport } from "../lib/item-answer";
import { itemAnsweredEventOf } from "./catalog-events";
import { catalogItemReportWiring } from "./catalog-item-report-wiring";

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
