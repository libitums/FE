// 체험판 흐름 → GA4 이벤트의 순수 함수 입출력입니다. 이벤트 모양은 `scripts/analytics.contract.ts`의 닫힌 목록이 정본입니다.
// 속성은 전부 문자열이고 들은 문장 · 대사 · 고른 보기 글 · 이름을 싣지 않습니다(타입이 막습니다).

import type {
  AnalyticsEvent,
  LatencyBucket,
  TrialBrowser,
  TrialCommonParams,
} from "../scripts/analytics.contract";
import type { TrialAction, TrialState } from "./trial-machine.contract";
import type { PreregOutcome } from "./trial-prereg.contract";

export type { AnalyticsEvent, TrialTurnCount } from "../scripts/analytics.contract";

/**
 * 전이 하나 → 보낼 이벤트(차례: trial_start → trial_roleplay_result → trial_step → trial_complete).
 * - `begin`(첫 탭) → trial_start, funnel 단계에 **처음** 닿을 때 trial_step(`ordinal` "1" ~ "9")
 * - 마지막 턴 `next` → trial_roleplay_result(같은 전이의 trial_step보다 먼저)
 * - complete에 들어설 때 trial_step 뒤 trial_complete
 */
export type TrialEventsOf = (
  prev: TrialState,
  next: TrialState,
  action: TrialAction,
) => readonly AnalyticsEvent[];

/** 사전 등록 결과 → trial_preregister. 이메일은 받지도 싣지도 않는다. */
export type TrialPreregEventOf = (outcome: PreregOutcome) => AnalyticsEvent;

/** 시도 시간(ms) → 구간. 2초 간격, 8초 이상 "8s+", 음수 · 수 아님은 "0-2s". */
export type LatencyBucketOf = (ms: number) => LatencyBucket;

/**
 * 말하기 시도 하나 → trial_speech_attempt. prev가 롤플레이 말하기 턴 `listening`이고 action이 `heard` ·
 * `speech-failed`이며 상태가 바뀐 전이에서만 낸다(시도마다 한 번). 그 밖은 null.
 */
export type TrialSpeechAttemptOf = (
  prev: TrialState,
  next: TrialState,
  action: TrialAction,
  latencyMs: number,
) => AnalyticsEvent | null;

/** 나가기 링크를 누른 단계 → trial_exit. */
export type TrialExitEventOf = (state: TrialState) => AnalyticsEvent;

/** gtag에 넘길 속성 — 이벤트 속성 + 공통 속성(browser). 원본은 바꾸지 않는다. */
export type TrialGtagParamsOf = (
  event: AnalyticsEvent,
  common: TrialCommonParams,
) => Readonly<Record<string, string>>;

/** User-Agent 글 → 브라우저 분류(순수). */
export type TrialBrowserOf = (userAgent: string) => TrialBrowser;
