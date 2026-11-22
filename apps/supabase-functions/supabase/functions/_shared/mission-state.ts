// 미션 턴의 상태 줄 해석과 판의 상태 전이(ADR-0177, PRD §3.4 · §3.6). 순수 함수입니다.
//
// 모델 답은 컴패니언과 같은 조각 줄(`@speech` · `@action`) 뒤에 상태 줄 하나를 씁니다 —
// `@state {"goals_done": ["order"], "off_task": false, "closing": false}`. 조각은 기존 해석기(`createSegmentSplitter`)가 나누고,
// 여기는 상태 줄의 글자(`stateText()`)만 미션 모양으로 읽습니다.
// - 상태 줄이 없거나 깨졌으면 진척은 그대로입니다(목표 변화 없음). 학습자 턴은 그래도 하나 셉니다 — 턴은 학습자가 말한 것이 기준입니다.
// - `goals_done`은 미션에 있는 id만 받고, 한 번 달성한 목표는 되돌리지 않습니다(모델이 빠뜨려도 지워지지 않는다).

import type { Segment } from "./chat-send.contract.ts";
import type { MissionEndReason, MissionEventData } from "./companion-contract/index.ts";
import type { MissionDefinition } from "./mission-definition.ts";
import { collectSegments, createSegmentSplitter, type SegmentDelta } from "./companion-segments.ts";

/** 상태 줄 하나를 읽은 결과. */
export type MissionTurnState = {
  readonly goalsDone: readonly string[];
  readonly offTask: boolean;
  readonly closing: boolean;
};

/** 판의 상태(`conversations.mission_state`). 학습자 턴 수는 끝난 턴만 센다. */
export type MissionProgress = {
  readonly goalsDone: readonly string[];
  readonly learnerTurns: number;
  readonly hintsUsed: number;
};

export const initialMissionProgress: MissionProgress = {
  goalsDone: [],
  learnerTurns: 0,
  hintsUsed: 0,
};

/** 상태 줄의 JSON(접두사 `@state ` 뒤)을 읽습니다. 객체가 아니면 null. 글자가 아닌 id · 빈 글은 버립니다. */
export function parseMissionState(text: string): MissionTurnState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const goals = Array.isArray(record["goals_done"]) ? record["goals_done"] : [];
  return {
    goalsDone: [
      ...new Set(
        goals
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id !== ""),
      ),
    ],
    offTask: record["off_task"] === true,
    closing: record["closing"] === true,
  };
}

/** 원문 전체 → 조각 + 상태(번들 `output.fixtures`와 단위 테스트가 쓰는 한 번에 읽기). 스트리밍은 해석기를 직접 쓴다. */
export function parseMissionReply(raw: string): {
  segments: Segment[];
  state: MissionTurnState | null;
} {
  const splitter = createSegmentSplitter();
  const deltas: SegmentDelta[] = [...splitter.push(raw), ...splitter.end()];
  const stateText = splitter.stateText();
  return {
    segments: collectSegments(deltas),
    state: stateText === null ? null : parseMissionState(stateText),
  };
}

/** 지난 달성 ∪ (보고된 것 ∩ 미션의 목표). 미션 파일의 순서로 돌려준다. */
export function mergeGoalsDone(
  mission: MissionDefinition,
  prior: readonly string[],
  reported: readonly string[],
): string[] {
  const done = new Set([...prior, ...reported]);
  return mission.goals.map((goal) => goal.id).filter((id) => done.has(id));
}

export const allRequiredDone = (mission: MissionDefinition, goalsDone: readonly string[]) =>
  mission.goals.every((goal) => !goal.required || goalsDone.includes(goal.id));

/** 끝 판정 — 필수 목표를 모두 이뤘으면 `goals`(성공), 아니고 학습자 턴이 상한에 닿았으면 `turn_limit`(실패), 아니면 null. */
export function missionEndReason(
  mission: MissionDefinition,
  progress: MissionProgress,
): MissionEndReason | null {
  if (allRequiredDone(mission, progress.goalsDone)) return "goals";
  if (progress.learnerTurns >= mission.turnLimit) return "turn_limit";
  return null;
}

export type MissionTurnOutcome = {
  readonly progress: MissionProgress;
  /** 이번 턴에 새로 달성한 목표(파일 순서). */
  readonly newlyDone: readonly string[];
  readonly ended: MissionEndReason | null;
  readonly offTask: boolean;
};

/**
 * 학습자 턴 하나가 끝났을 때의 전이. `state`가 null(상태 줄 없음 · 깨짐)이면 목표는 그대로, 학습자 턴만 +1.
 * 이미 끝난 판(`missionEndReason`이 null이 아님)에 부르지 않는다 — 호출하는 쪽이 판의 `status`로 막는다.
 */
export function advanceMission(
  mission: MissionDefinition,
  progress: MissionProgress,
  state: MissionTurnState | null,
): MissionTurnOutcome {
  const goalsDone = mergeGoalsDone(mission, progress.goalsDone, state?.goalsDone ?? []);
  const next: MissionProgress = {
    goalsDone,
    learnerTurns: progress.learnerTurns + 1,
    hintsUsed: progress.hintsUsed,
  };
  return {
    progress: next,
    newlyDone: goalsDone.filter((id) => !progress.goalsDone.includes(id)),
    ended: missionEndReason(mission, next),
    offTask: state?.offTask ?? false,
  };
}

/** SSE `mission` 이벤트의 값. */
export function missionEventData(
  conversationId: string,
  mission: MissionDefinition,
  progress: MissionProgress,
): MissionEventData {
  return {
    conversationId,
    goals: mission.goals.map((goal) => ({
      id: goal.id,
      done: progress.goalsDone.includes(goal.id),
    })),
    turnsLeft: Math.max(0, mission.turnLimit - progress.learnerTurns),
    ended: missionEndReason(mission, progress),
  };
}

const count = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

/** `mission_state jsonb`(snake_case) → 판 상태. 모르는 모양은 처음 상태로 읽는다. 목표는 미션에 있는 id만. */
export function progressFromJson(mission: MissionDefinition, raw: unknown): MissionProgress {
  if (typeof raw !== "object" || raw === null) return initialMissionProgress;
  const record = raw as Record<string, unknown>;
  const goals = Array.isArray(record["goals_done"])
    ? record["goals_done"].filter((id): id is string => typeof id === "string")
    : [];
  return {
    goalsDone: mergeGoalsDone(mission, [], goals),
    learnerTurns: count(record["learner_turns"]),
    hintsUsed: count(record["hints_used"]),
  };
}

/** 판 상태 → `mission_state jsonb`(snake_case). */
export const progressToJson = (progress: MissionProgress) => ({
  goals_done: [...progress.goalsDone],
  learner_turns: progress.learnerTurns,
  hints_used: progress.hintsUsed,
});
