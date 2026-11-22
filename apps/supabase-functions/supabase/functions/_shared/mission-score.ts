// 미션 점수식(ADR-0177 D5, PRD §3.7). 세부 점수는 채점자가 내고 합산은 코드가 합니다 — 같은 세부 점수에서 늘 같은 최종 점수가
// 나오고, 가중치를 바꿀 때 프롬프트를 건드리지 않습니다. 순수 함수입니다.
//
//   과업      = 100 × 달성한 목표 수 ÷ 전체 목표 수          (필수 · 선택 모두)
//   목표 표현 = 100 × 쓴 목표 표현 수 ÷ 목표 표현 수        (목표 표현이 없으면 100)
//   최종      = max(0, round(w.task × 과업 + w.accuracy × 정확도 + w.expression × 목표 표현) − 감점 × 힌트 횟수)
//   성공      = 필수 목표를 모두 달성
//
// 반올림은 0.5에서 올립니다(half up). 부동소수 오차(예: 72.99999…)를 막으려고 소수 여섯째 자리에서 먼저 정리합니다 —
// 실험실 번들의 `scoring.rounding`이 같은 규칙을 적어 둡니다.

import type { MissionOutcome } from "./companion-contract/index.ts";

export type MissionScoring = {
  readonly weights: {
    readonly task: number;
    readonly accuracy: number;
    readonly expression: number;
  };
  readonly hintPenalty: number;
};

/** 기본 가중치 50 · 30 · 20과 힌트 감점 5(PRD §3.7 — 운영 값은 `companion.settings`, 미정 M3). */
export const defaultMissionScoring: MissionScoring = {
  weights: { task: 0.5, accuracy: 0.3, expression: 0.2 },
  hintPenalty: 5,
};

/** 한 판의 힌트 상한(PRD §3.5). */
export const missionHintLimit = 3;

export type MissionScoreInput = {
  readonly goals: readonly { readonly required: boolean; readonly done: boolean }[];
  /** 채점자의 정확도(0 ~ 100). 범위를 벗어나면 자른다. */
  readonly accuracy: number;
  readonly expressionsUsed: number;
  readonly expressionsTotal: number;
  readonly hintsUsed: number;
};

export type MissionScore = {
  readonly task: number;
  readonly accuracy: number;
  readonly expression: number;
  readonly total: number;
  readonly outcome: MissionOutcome;
};

const clamp = (value: number, low: number, high: number) =>
  Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;

/** 0.5에서 올리는 반올림(부동소수 오차를 먼저 정리). */
export const roundHalfUp = (value: number): number => Math.floor(Number(value.toFixed(6)) + 0.5);

export function scoreMission(
  input: MissionScoreInput,
  scoring: MissionScoring = defaultMissionScoring,
): MissionScore {
  const total = input.goals.length;
  const done = input.goals.filter((goal) => goal.done).length;
  const task = total === 0 ? 0 : (100 * done) / total;
  const accuracy = clamp(input.accuracy, 0, 100);
  const expressionsTotal = Math.max(0, input.expressionsTotal);
  const expression =
    expressionsTotal === 0
      ? 100
      : (100 * clamp(input.expressionsUsed, 0, expressionsTotal)) / expressionsTotal;
  const { weights } = scoring;
  const weighted = roundHalfUp(
    weights.task * task + weights.accuracy * accuracy + weights.expression * expression,
  );
  const hints = Math.max(0, input.hintsUsed);
  return {
    task,
    accuracy,
    expression,
    // 가중치 합이 1이면 100을 넘지 않는다 — 운영 값이 어긋나도 리포트 범위(0 ~ 100)를 지킨다.
    total: Math.min(100, Math.max(0, weighted - scoring.hintPenalty * hints)),
    outcome: input.goals.every((goal) => !goal.required || goal.done) ? "success" : "fail",
  };
}
