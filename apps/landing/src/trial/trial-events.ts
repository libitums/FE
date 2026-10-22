// 체험판 전이 → GA4 이벤트입니다(순수). 속성은 전부 문자열이고 들은 문장 · 대사 · 이름을 싣지 않습니다.

import type {
  AnalyticsEvent,
  LatencyBucket,
  SpeechAttemptOutcome,
  TrialTurnCount,
  TrialTurnOrdinal,
} from "../scripts/analytics.contract";
import type {
  LatencyBucketOf,
  TrialEventsOf,
  TrialExitEventOf,
  TrialGtagParamsOf,
  TrialPreregEventOf,
  TrialSpeechAttemptOf,
} from "./trial-events.contract";
import type { TrialFunnelStep, TurnRecord } from "./trial-machine.contract";

/** 이탈 측정의 단계 차례 — `ordinal` "1" ~ "9". */
const FUNNEL: readonly TrialFunnelStep[] = [
  "prologue",
  "vocab",
  "image-match",
  "reply-select",
  "culture",
  "roleplay",
  "epilogue",
  "clear",
  "complete",
];

const COUNTS: readonly TrialTurnCount[] = ["0", "1", "2", "3"];
/** 턴 수를 닫힌 문자열로 — 세 턴을 넘는 값은 없습니다(넘으면 "3"으로 막습니다). */
const countOf = (count: number): TrialTurnCount => COUNTS[Math.min(count, 3)] ?? "3";

const countWhere = (records: readonly TurnRecord[], test: (record: TurnRecord) => boolean) =>
  countOf(records.filter(test).length);

/** 전이 하나에 보낼 이벤트(차례: 시작 → 결과 → 단계 → 완료). */
export const trialEventsOf: TrialEventsOf = (prev, next, action) => {
  if (prev === next) return [];
  const events: AnalyticsEvent[] = [];
  if (action.type === "begin" && !prev.begun && next.begun) {
    events.push({
      name: "trial_start",
      params: { speech: next.speech === "supported" ? "supported" : "unsupported" },
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

/** 사전 등록 결과 → trial_preregister. 이메일은 받지도 싣지도 않습니다. */
export const trialPreregEventOf: TrialPreregEventOf = (outcome) => ({
  name: "trial_preregister",
  params: { status: outcome },
});

const BUCKETS: readonly LatencyBucket[] = ["0-2s", "2-4s", "4-6s", "6-8s", "8s+"];

export const latencyBucketOf: LatencyBucketOf = (ms) =>
  BUCKETS[Math.min(Math.max(Math.floor(ms / 2000), 0) || 0, 4)] ?? "0-2s";

const ORDINALS: readonly TrialTurnOrdinal[] = ["1", "2", "3"];

/** 말하기 시도 하나 → trial_speech_attempt(듣는 중에서 판정 · 실패로 바뀐 전이만). */
export const trialSpeechAttemptOf: TrialSpeechAttemptOf = (prev, next, action, latencyMs) => {
  const { turn } = prev.roleplay;
  const listening =
    prev.step === "roleplay" && turn.mode === "speech" && turn.phase === "listening";
  if (!listening || prev === next) return null;
  let outcome: SpeechAttemptOutcome;
  if (action.type === "heard") outcome = next.roleplay.turn.spoken?.outcome ?? "incorrect";
  else if (action.type === "speech-failed") {
    outcome = action.reason === "unsupported" ? "unavailable" : action.reason;
  } else return null;
  return {
    name: "trial_speech_attempt",
    params: {
      turn: ORDINALS[Math.min(turn.index, 2)] ?? "3",
      outcome,
      latency_bucket: latencyBucketOf(latencyMs),
    },
  };
};

/** 나가기 링크를 누른 단계 → trial_exit. */
export const trialExitEventOf: TrialExitEventOf = (state) => ({
  name: "trial_exit",
  params: { step: state.step },
});

/** gtag 속성 — 이벤트 속성에 browser를 더한 새 객체입니다. */
export const trialGtagParamsOf: TrialGtagParamsOf = (event, common) => ({
  ...event.params,
  browser: common.browser,
});
