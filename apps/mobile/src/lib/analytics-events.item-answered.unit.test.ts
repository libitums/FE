import { describe, expect, test } from "vitest";

import { airbridgeEventFrom } from "./airbridge-events";
import { analyticsCaptureFrom } from "./analytics-events";
import type { EpisodeItemAnsweredEvent } from "./catalog-learning-event.contract";

// `unit` 계층: 문항 판정 이벤트가 capture로 바뀌고 Airbridge로는 가지 않는 입출력만 봅니다.

const event: EpisodeItemAnsweredEvent = {
  name: "episode_item_answered",
  episodeId: "u00-tutorial",
  unitKey: "S7",
  itemId: "S7-01",
  itemType: "LISTEN_BUILD",
  result: "incorrect",
  density: "compact",
};

describe("episode_item_answered 매핑 (EV4)", () => {
  test("이름은 그대로 capture 이름이 되고 나머지 필드가 속성이 된다", () => {
    const capture = analyticsCaptureFrom as unknown as (value: EpisodeItemAnsweredEvent) => {
      readonly event: string;
      readonly properties: Record<string, unknown>;
    };

    expect(capture(event)).toEqual({
      event: "episode_item_answered",
      properties: {
        episodeId: "u00-tutorial",
        unitKey: "S7",
        itemId: "S7-01",
        itemType: "LISTEN_BUILD",
        result: "incorrect",
        density: "compact",
      },
    });
  });

  test("Airbridge 이벤트로는 바뀌지 않는다", () => {
    const map = airbridgeEventFrom as unknown as (value: EpisodeItemAnsweredEvent) => unknown;

    expect(map(event)).toBeNull();
  });
});
