// 미션 한 판의 순수 상태 기계입니다(PRD §3.3 ~ §3.6) — UI를 import하지 않습니다.
// 턴의 SSE는 메신저 턴 리듀서(`applyTurnEvent`)로 접고, 그 리듀서가 모르는 `mission` 이벤트(목표 진척 · 남은 턴 · 끝)만 여기서 읽습니다.
// 변화가 없으면 같은 참조를 돌려줍니다 — 늦게 온 응답 · 두 번 누른 버튼이 상태를 흔들지 않습니다.

import { applyTurnEvent, endTurn, initialTurnState } from "../messenger-chat/companion-turn";
import type { TurnState } from "../messenger-chat/companion-turn";
import type {
  MissionEndReason,
  MissionGoalState,
  MissionLine,
  MissionSessionAction,
  MissionSessionState,
} from "./roleplay-mission.contract";

export function initialMissionSession(missionId: string): MissionSessionState {
  return {
    phase: "preview",
    missionId,
    startError: null,
    conversationId: null,
    counterpartLabel: "",
    goals: [],
    turnLimit: 0,
    turnsLeft: 0,
    hintsLeft: 0,
    hintsUsed: 0,
    lines: [],
    turn: null,
    turnLineId: null,
    sentCount: 0,
    hint: null,
    hintLoading: false,
    endReason: null,
    report: null,
    gradingFailure: null,
  };
}

/** `mission` 이벤트의 값 — 모양이 틀리면 `null`(버립니다). */
export type MissionProgress = {
  readonly goals: readonly { readonly id: string; readonly done: boolean }[];
  readonly turnsLeft: number;
  readonly ended: MissionEndReason | null;
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

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
  const ended = payload.ended === "goals" || payload.ended === "turn_limit" ? payload.ended : null;
  if (payload.ended !== null && ended === null) return null;
  const goals = payload.goals.flatMap((raw) => {
    const goal = recordOf(raw);
    return goal !== null && typeof goal.id === "string" && typeof goal.done === "boolean"
      ? [{ id: goal.id, done: goal.done }]
      : [];
  });
  return { goals, turnsLeft, ended };
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

const updateMine = (
  lines: readonly MissionLine[],
  id: string | null,
  patch: (line: Extract<MissionLine, { kind: "me" }>) => MissionLine,
): readonly MissionLine[] =>
  lines.map((line) => (line.kind === "me" && line.id === id ? patch(line) : line));

// 턴 하나를 닫습니다 — 실패면 내 줄에 표시하고 내 차례로, 성공이면 상대역 말풍선을 줄로 옮기고 교정을 내 줄에 붙입니다.
function closeTurn(state: MissionSessionState, turn: TurnState): MissionSessionState {
  if (turn.failure !== null) {
    return {
      ...state,
      phase: "talking",
      turn: null,
      turnLineId: null,
      lines: updateMine(state.lines, state.turnLineId, (line) => ({ ...line, failed: true })),
    };
  }
  const replyId = turn.assistantMessageId ?? `reply-${String(state.sentCount)}`;
  const replies: MissionLine[] = turn.bubbles.map((bubble, index) => ({
    kind: "them",
    id: `${replyId}:${String(index)}`,
    ko: bubble.ko,
    translation: bubble.en === "" ? null : bubble.en,
  }));
  const withCorrection = updateMine(state.lines, state.turnLineId, (line) => ({
    ...line,
    serverId: turn.userMessageId,
    correction: turn.correction?.card ?? null,
  }));
  return {
    ...state,
    phase: state.endReason === null ? "talking" : "ended",
    turn: null,
    turnLineId: null,
    lines: [...withCorrection, ...replies],
  };
}

function onTurnEvent(state: MissionSessionState, event: string, data: string): MissionSessionState {
  if (state.phase !== "awaiting" || state.turn === null) return state;
  let next = state;
  if (event === "mission") {
    const progress = missionProgressOf(data);
    if (progress !== null) {
      next = {
        ...state,
        goals: mergeGoals(state.goals, progress),
        turnsLeft: Math.min(state.turnsLeft, progress.turnsLeft),
        endReason: progress.ended ?? state.endReason,
      };
    }
  }
  const turn = applyTurnEvent(state.turn, event, data);
  if (turn === state.turn) return next;
  return turn.finished ? closeTurn(next, turn) : { ...next, turn };
}

export function missionSessionReducer(
  state: MissionSessionState,
  action: MissionSessionAction,
): MissionSessionState {
  switch (action.type) {
    case "start-requested":
      return state.phase === "preview" ? { ...state, phase: "starting", startError: null } : state;
    case "started": {
      if (state.phase !== "starting") return state;
      const { value } = action;
      return {
        ...state,
        phase: "talking",
        conversationId: value.conversationId,
        counterpartLabel: value.counterpart.label,
        goals: value.goals,
        turnLimit: value.turnLimit,
        turnsLeft: value.turnsLeft,
        hintsLeft: value.hintsLeft,
        lines: [
          {
            kind: "them",
            id: value.opening.messageId,
            ko: value.opening.ko,
            translation: value.opening.translation ?? value.opening.en,
          },
        ],
      };
    }
    case "start-rejected":
      return state.phase === "starting"
        ? { ...state, phase: "preview", startError: action.code }
        : state;
    case "send": {
      const text = action.text.trim();
      if (state.phase !== "talking" || text === "" || state.turnsLeft === 0) return state;
      const id = `me-${String(state.sentCount + 1)}`;
      const line: MissionLine = {
        kind: "me",
        id,
        serverId: null,
        ko: text,
        inputMode: action.inputMode,
        failed: false,
        correction: null,
      };
      return {
        ...state,
        phase: "awaiting",
        lines: [...state.lines, line],
        turn: initialTurnState,
        turnLineId: id,
        sentCount: state.sentCount + 1,
        hint: null,
      };
    }
    case "turn-event":
      return onTurnEvent(state, action.event, action.data);
    case "turn-closed":
      return state.phase === "awaiting" && state.turn !== null
        ? closeTurn(state, endTurn(state.turn, "closed", { kind: "failed" }))
        : state;
    case "hint-requested":
      return (state.phase === "talking" || state.phase === "awaiting") &&
        state.hintsLeft > 0 &&
        !state.hintLoading
        ? { ...state, hintLoading: true }
        : state;
    case "hint-received":
      return state.hintLoading
        ? {
            ...state,
            hintLoading: false,
            hint: action.value,
            hintsLeft: action.value.hintsLeft,
            hintsUsed: state.hintsUsed + 1,
          }
        : state;
    case "hint-unavailable":
      return state.hintLoading ? { ...state, hintLoading: false, hintsLeft: 0 } : state;
    case "hint-dismissed":
      return state.hint === null ? state : { ...state, hint: null };
    case "grading-requested":
      return state.phase === "ended" || state.phase === "grading-failed"
        ? { ...state, phase: "grading", gradingFailure: null }
        : state;
    case "finished":
      return finishWith(state, action.value);
    case "finish-failed":
      return state.phase === "grading"
        ? {
            ...state,
            phase: "grading-failed",
            gradingFailure: { refunded: false, retryable: true },
          }
        : state;
    case "abandoned":
      return state.phase === "talking" || state.phase === "awaiting" || state.phase === "starting"
        ? { ...state, phase: "abandoned", turn: null, turnLineId: null, hint: null }
        : state;
    case "reset":
      return state.phase === "report" ||
        state.phase === "grading-failed" ||
        state.phase === "abandoned"
        ? initialMissionSession(state.missionId)
        : state;
  }
}

function finishWith(
  state: MissionSessionState,
  value: Extract<MissionSessionAction, { type: "finished" }>["value"],
): MissionSessionState {
  if (state.phase !== "grading") return state;
  switch (value.status) {
    case "graded":
      return { ...state, phase: "report", report: value.report, gradingFailure: null };
    case "grading_failed":
      return {
        ...state,
        phase: "grading-failed",
        gradingFailure: { refunded: value.refunded, retryable: value.retryable },
      };
    case "abandoned":
      return { ...state, phase: "abandoned" };
  }
}

/** 지금 보낼 수 있는가 — 내 차례이고 남은 턴이 있을 때만입니다. */
export function canSendMission(state: MissionSessionState): boolean {
  return state.phase === "talking" && state.turnsLeft > 0;
}

/** 힌트 버튼을 누를 수 있는가 — 대화 중이고 남은 힌트가 있고 받는 중이 아닐 때. */
export function canAskHint(state: MissionSessionState): boolean {
  return (
    (state.phase === "talking" || state.phase === "awaiting") &&
    state.hintsLeft > 0 &&
    !state.hintLoading
  );
}
