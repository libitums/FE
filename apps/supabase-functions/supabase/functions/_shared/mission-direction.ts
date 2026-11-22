// 미션 턴의 연출 지시(ADR-0177 D11) — 상대역이 평가 항목(목표)을 꺼낼 기회를 만들도록, 코드가 「다음 비트」를 정해 턴마다 동적
// 프롬프트에 한 줄로 넣습니다. 순수 함수입니다. 판 상태는 이번 학습자 메시지 앞의 것이라, 지시는 「이번 말이 이미 이뤘으면 다음으로」를 품습니다.
//
// 규칙(위에서 먼저 맞는 것):
//   1. stuck  — 새 목표 없이 지난 학습자 턴이 `stuckAfter`번 이어졌다 → 지금 질문을 더 짧고 쉽게 다시(두 가지 고르기 허용).
//   2. hurry  — 남은 턴 ≤ `hurryTurnsLeft`이고 필수가 남았다 → 필수 목표로 곧장.
//   3. advance — 상대역이 꺼내는(`opener` ≠ learner) 남은 목표(필수 먼저 · 파일 순서) → 그것을 물어라(목표의 `cue` 예시).
//   4. room   — 상대역이 꺼낼 목표가 없고 학습자가 꺼내야 하는 목표만 남았다 → 닫지 말고 여지만 둬라.
// 학습자가 꺼내야 하는 목표가 남아 있으면 어느 비트든 끝에 「그것은 묻지도 먼저 말하지도 마라」 한 줄을 붙입니다.
// 캐시되는 앞부분(`turnSystemStable`)은 바꾸지 않습니다 — 이 줄은 `turnDynamic`의 `{{direction}}` 자리에 들어갑니다.

import type { MissionDefinition, MissionGoal } from "./mission-definition.ts";
import type { MissionProgress } from "./mission-state.ts";
import { fillTemplate } from "./mission-template.ts";

export type MissionBeat = "stuck" | "hurry" | "advance" | "room";

export const stuckAfter = 2;
export const hurryTurnsLeft = 2;

/** 비트마다의 글(영어 — 상대역 모델에게). 실험실 번들이 같은 틀을 쓴다. */
export const directionTemplates = {
  stuck:
    "The learner seems stuck (no progress for {{stall}} turns). Ask your current question about goal {{goal_id}} again in fewer, easier words; you may offer two short choices. Do not explain grammar or answer for them. If the learner's message already does it, {{then}}.",
  hurry:
    "Only {{turns_left}} learner turns are left: go straight to the required goal {{goal_id}} ({{criteria}}){{cue_part}}. If the learner's message already does it, {{then}}.",
  advance:
    "Next beat: after reacting briefly, open goal {{goal_id}} ({{criteria}}) yourself{{cue_part}}. If the learner's message already does it, {{then}}.",
  room: "Every goal you can open is done, but the scene is not over: react briefly to what the learner said and then wait. Do not ask whether they need anything else and do not offer anything; leave the next move to the learner. Do not close the scene unless the learner's message completes every open goal.",
  learnerGoals:
    "Goals the learner must raise themselves: {{goals}}. Never ask about them, never give that information first, even though you know it from the scene (if the goal is to ask a question, such as the price, do not say the answer until they ask — not even when you take the order or the payment), and never hint at the exact words.",
  cuePart: ", for example 「{{cue}}」",
  thenNext: "open {{goal_id}} instead{{cue_part}}",
  thenRoom: "just react and wait (do not say goodbye: the scene is not over)",
  thenClose: "every goal is done: close the scene",
  noCue: " with a natural question",
} as const;

export type MissionDirectionInput = {
  readonly mission: MissionDefinition;
  /** 이번 학습자 메시지 앞의 판 상태. */
  readonly progress: MissionProgress;
};

export type MissionDirection = {
  readonly beat: MissionBeat;
  /** 비트가 겨누는 목표(room이면 null). */
  readonly goalId: string | null;
  readonly text: string;
};

const opensItself = (goal: MissionGoal) => goal.opener !== "learner";

function cuePart(goal: MissionGoal): string {
  if (!opensItself(goal)) return "";
  return goal.cue === undefined
    ? directionTemplates.noCue
    : fillTemplate(directionTemplates.cuePart, { cue: goal.cue });
}

/** 남은 목표를 필수 먼저 · 파일 순서로. */
function openGoals(mission: MissionDefinition, done: readonly string[]): MissionGoal[] {
  const open = mission.goals.filter((goal) => !done.includes(goal.id));
  return [...open.filter((goal) => goal.required), ...open.filter((goal) => !goal.required)];
}

/** 지금 겨누는 목표 다음에 꺼낼 것 — 상대역이 꺼내는 남은 목표(필수 먼저), 없으면 기다리기 · 닫기. */
function thenAfter(goal: MissionGoal | undefined, open: readonly MissionGoal[]): string {
  const rest = open.filter((entry) => entry.id !== goal?.id);
  const next = rest.find(opensItself);
  if (next !== undefined)
    return fillTemplate(directionTemplates.thenNext, { goal_id: next.id, cue_part: cuePart(next) });
  return rest.length > 0 ? directionTemplates.thenRoom : directionTemplates.thenClose;
}

function primary(input: MissionDirectionInput, open: readonly MissionGoal[]) {
  const { mission, progress } = input;
  const stall = progress.stall ?? 0;
  const turnsLeft = Math.max(0, mission.turnLimit - progress.learnerTurns);
  const counterpartOpen = open.filter(opensItself);
  if (stall >= stuckAfter)
    return {
      beat: "stuck" as const,
      goalId: (counterpartOpen[0] ?? open[0])?.id ?? null,
      text: fillTemplate(directionTemplates.stuck, {
        stall,
        goal_id: (counterpartOpen[0] ?? open[0])?.id ?? "",
        then: thenAfter(counterpartOpen[0] ?? open[0], open),
      }),
    };
  const required = open.find((goal) => goal.required);
  if (required !== undefined && turnsLeft <= hurryTurnsLeft)
    return {
      beat: "hurry" as const,
      goalId: required.id,
      text: fillTemplate(directionTemplates.hurry, {
        turns_left: turnsLeft,
        goal_id: required.id,
        criteria: required.criteria,
        cue_part: cuePart(required),
        then: thenAfter(required, open),
      }),
    };
  const goal = counterpartOpen[0];
  if (goal !== undefined) {
    const then = thenAfter(goal, open);
    return {
      beat: "advance" as const,
      goalId: goal.id,
      text: fillTemplate(directionTemplates.advance, {
        goal_id: goal.id,
        criteria: goal.criteria,
        cue_part: cuePart(goal),
        then,
      }),
    };
  }
  return { beat: "room" as const, goalId: null, text: directionTemplates.room };
}

/** 이번 턴의 연출 지시. 남은 목표가 없으면(끝난 판) null — 끝난 판에는 턴이 오지 않는다. */
export function missionDirection(input: MissionDirectionInput): MissionDirection | null {
  const open = openGoals(input.mission, input.progress.goalsDone);
  if (open.length === 0) return null;
  const head = primary(input, open);
  const learnerGoals = open.filter((goal) => !opensItself(goal));
  const tail =
    learnerGoals.length === 0
      ? ""
      : ` ${fillTemplate(directionTemplates.learnerGoals, {
          goals: learnerGoals.map((goal) => `${goal.id} (${goal.criteria})`).join("; "),
        })}`;
  return { ...head, text: `${head.text}${tail}` };
}
