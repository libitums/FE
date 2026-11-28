// 미션 턴의 `mission` 이벤트(목표 진척 · 남은 턴 · 끝 · 필수 달성)를 읽는 순수 규칙입니다 — UI를 import하지 않습니다.

import type { MissionEndReason, MissionGoalState } from "./roleplay-mission.contract";

/** `mission` 이벤트의 값 — 모양이 틀리면 `null`(버립니다). */
export type MissionProgress = {
  readonly goals: readonly { readonly id: string; readonly done: boolean }[];
  readonly turnsLeft: number;
  readonly ended: MissionEndReason | null;
  /** 필수 목표를 모두 이뤘는가(ADR-0193). 칸이 없는 옛 이벤트는 `false`. */
  readonly requiredDone: boolean;
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const endReasonOf = (value: unknown): MissionEndReason | null =>
  value === "goals" || value === "turn_limit" || value === "finish" ? value : null;

export function missionProgressOf(data: string): MissionProgress | null {
  let payload: Record<string, unknown> | null;
  try {
    payload = recordOf(JSON.parse(data) as unknown);
  } catch {
    return null;
  }
  if (payload === null || !Array.isArray(payload.goals)) return null;
  const turnsLeft = payload.turnsLeft;
  if (typeof turnsLeft !== "number" || !Number.isInteger(turnsLeft) || turnsLeft < 0) return null;
  const ended = endReasonOf(payload.ended);
  if (payload.ended !== null && ended === null) return null;
  const goals = payload.goals.flatMap((raw) => {
    const goal = recordOf(raw);
    return goal !== null && typeof goal.id === "string" && typeof goal.done === "boolean"
      ? [{ id: goal.id, done: goal.done }]
      : [];
  });
  return { goals, turnsLeft, ended, requiredDone: payload.requiredDone === true };
}

/** 목표는 한 번 이루면 되돌리지 않습니다(PRD §3.4). 정의에 없는 id는 버립니다. */
export function mergeGoals(
  goals: readonly MissionGoalState[],
  progress: MissionProgress,
): readonly MissionGoalState[] {
  const done = new Set(progress.goals.filter((goal) => goal.done).map((goal) => goal.id));
  const changed = goals.some((goal) => !goal.done && done.has(goal.id));
  return changed
    ? goals.map((goal) => (done.has(goal.id) ? { ...goal, done: true } : goal))
    : goals;
}

/** 필수 목표를 모두 이뤘는가 — 성공의 유일한 기준입니다(PRD §0.7). */
export function requiredGoalsDone(goals: readonly MissionGoalState[]): boolean {
  return goals.every((goal) => !goal.required || goal.done);
}
