import { describe, expect, test } from "vitest";

import type { AnalyticsEvent } from "./analytics.contract";
import { analyticsCaptureFrom } from "./analytics-events";

// 기존 analytics-events.unit.test.ts가 300줄을 넘어 절을 따로 둡니다.

const events = [
  { event: { name: "progress_load_delayed" }, properties: {} },
  { event: { name: "progress_load_failed", attempt: "first" }, properties: { attempt: "first" } },
  { event: { name: "progress_load_failed", attempt: "retry" }, properties: { attempt: "retry" } },
  {
    event: { name: "progress_load_recovered", trigger: "auto" },
    properties: { trigger: "auto" },
  },
  {
    event: { name: "progress_load_recovered", trigger: "manual" },
    properties: { trigger: "manual" },
  },
] as const satisfies readonly { event: AnalyticsEvent; properties: Record<string, unknown> }[];

describe("진행 불러오기 이벤트 capture", () => {
  test.each(events.map((e, i) => [`${i + 1}. ${e.event.name}`, e] as const))(
    "EV1. %s — 이벤트 이름 그대로, properties는 name을 뺀 나머지",
    (_label, { event, properties }) => {
      expect(analyticsCaptureFrom(event)).toStrictEqual({ event: event.name, properties });
    },
  );
});
