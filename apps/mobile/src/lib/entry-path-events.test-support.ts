// 입장 선택 이벤트(ADR-0176)의 입력 표입니다 — Airbridge 매핑 시험이 씁니다.
import type { AnalyticsEvent, AnalyticsEventName } from "./analytics.contract";

export const entryPathEventNames = [
  "entry_path_selected",
  "entry_basics_step_completed",
  "entry_basics_skipped",
] as const satisfies readonly AnalyticsEventName[];

export const entryPathEventExamples = [
  { name: "entry_path_selected", path: "story" },
  { name: "entry_basics_step_completed", step: "letters" },
  { name: "entry_basics_skipped", step: "letters" },
] as const satisfies readonly AnalyticsEvent[];
