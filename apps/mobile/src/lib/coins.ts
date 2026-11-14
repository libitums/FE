// 학습 보상 엽전입니다(ADR-0116). 보유량은 따로 세지 않고 「엽전을 받은 유닛」(진행 스냅숏의 `coinUnits`)에서
// 파생합니다 — 유닛 목록은 기기 · 서버 병합이 키별 합집합이라 두 기기에서 받은 엽전이 합쳐지고 줄지 않습니다.

import type { CatalogProgress } from "./catalog-progress";
import type { AssessmentVerdict } from "../screens/assessment/assessment";

/** 카탈로그 레슨 · 최종 테스트를 처음 통과하면 받는 엽전 수입니다(사용자 결정 2026-11-09 → 2026-11-14 10에서 5). */
export const COINS_PER_LESSON = 5;

/** 보유 엽전 = 유닛 하나에 `COINS_PER_LESSON`씩입니다. 던지지 않습니다. */
export function coinBalanceOf(coinUnits: CatalogProgress): number {
  return Object.values(coinUnits).reduce((sum, keys) => sum + keys.length, 0) * COINS_PER_LESSON;
}

/** 결과 화면이 보이는 이번 보상입니다 — 처음 통과만 받고, 미통과 · 다시 하기는 0입니다. */
export function lessonCoinReward(verdict: AssessmentVerdict, firstClear: boolean): number {
  return verdict === "passed" && firstClear ? COINS_PER_LESSON : 0;
}

/** 칩으로 날아갈 엽전 수입니다 — 보상 하나에 하나입니다. 0 이하 · 숫자가 아니면 0, 소수는 내립니다. */
export function coinFlightCount(reward: number): number {
  return Number.isFinite(reward) && reward > 0 ? Math.floor(reward) : 0;
}

/** 엽전이 `landed`개 닿았을 때 칩이 보일 값입니다 — 보상보다 많이 오르지 않습니다. */
export function coinFlightValueAt(start: number, landed: number, reward: number): number {
  return start + Math.min(landed, reward);
}
