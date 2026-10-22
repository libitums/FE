// 체험판 흐름 → GA4 이벤트의 순수 함수 입출력입니다. 이벤트 모양은 `scripts/analytics.contract.ts`의 닫힌 목록이 정본입니다.
// 속성은 전부 문자열이고 들은 문장 · 대사 · 고른 보기 글 · 이름을 싣지 않습니다(타입이 막습니다).

import type { AnalyticsEvent } from "../scripts/analytics.contract";
import type { TrialAction, TrialState } from "./trial-machine.contract";

export type { AnalyticsEvent, TrialTurnCount } from "../scripts/analytics.contract";

/**
 * 전이 하나 → 보낼 이벤트(차례: trial_roleplay_result → trial_step → trial_complete).
 * - `start` → trial_start, funnel 단계에 **처음** 들어설 때 trial_step(`ordinal` "1" ~ "8")
 * - 마지막 턴 `next` → trial_roleplay_result(같은 전이의 trial_step보다 먼저)
 * - complete에 들어설 때 trial_step 뒤 trial_complete
 */
export type TrialEventsOf = (
  prev: TrialState,
  next: TrialState,
  action: TrialAction,
) => readonly AnalyticsEvent[];

/** 완료 화면의 `data-trial-store` → trial_store_click. 모르는 값 · 없음 → null. */
export type TrialStoreClickOf = (store: string | undefined) => AnalyticsEvent | null;
