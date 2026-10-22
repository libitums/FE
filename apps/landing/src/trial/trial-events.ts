// 체험판 전이 → GA4 이벤트입니다(순수). 속성은 전부 문자열이고 들은 문장 · 대사 · 이름을 싣지 않습니다.

import type { AnalyticsEvent, TrialTurnCount } from "../scripts/analytics.contract";
import type { TrialEventsOf, TrialStoreClickOf } from "./trial-events.contract";
import type { TrialFunnelStep, TurnRecord } from "./trial-machine.contract";

/** 이탈 측정의 단계 차례 — `ordinal` "1" ~ "8". */
const FUNNEL: readonly TrialFunnelStep[] = [
  "prologue",
  "vocab",
  "image-match",
  "reply-select",
  "culture",
  "roleplay",
  "epilogue",
  "complete",
];

const COUNTS: readonly TrialTurnCount[] = ["0", "1", "2", "3"];
/** 턴 수를 닫힌 문자열로 — 세 턴을 넘는 값은 없습니다(넘으면 "3"으로 막습니다). */
const countOf = (count: number): TrialTurnCount => COUNTS[Math.min(count, 3)] ?? "3";

const countWhere = (records: readonly TurnRecord[], test: (record: TurnRecord) => boolean) =>
  countOf(records.filter(test).length);

/** 전이 하나에 보낼 이벤트(차례: 결과 → 단계 → 완료). */
export const trialEventsOf: TrialEventsOf = (prev, next, action) => {
  if (prev === next) return [];
  const events: AnalyticsEvent[] = [];
  if (action.type === "start" && prev.step === "start") {
    events.push({
      name: "trial_start",
      params: { speech: prev.speech === "supported" ? "supported" : "unsupported" },
    });
  }
  const { verdict, records } = next.roleplay;
  if (prev.roleplay.verdict === null && verdict !== null) {
    events.push({
      name: "trial_roleplay_result",
      params: {
        verdict,
        correct: countWhere(records, (record) => record.result === "correct"),
        by_speech: countWhere(records, (record) => record.mode === "speech"),
        by_tiles: countWhere(records, (record) => record.mode === "tiles"),
        speech: next.speech,
      },
    });
  }
  for (const step of next.reached.filter((reached) => !prev.reached.includes(reached))) {
    events.push({
      name: "trial_step",
      params: { step, ordinal: String(FUNNEL.indexOf(step) + 1) },
    });
  }
  if (prev.step !== "complete" && next.step === "complete") {
    events.push({ name: "trial_complete", params: { verdict: verdict ?? "failed" } });
  }
  return events;
};

/** 완료 화면의 `data-trial-store` → trial_store_click. 모르는 값 · 없음 → null. */
export const trialStoreClickOf: TrialStoreClickOf = (store) =>
  store === "ios" || store === "android" ? { name: "trial_store_click", params: { store } } : null;
