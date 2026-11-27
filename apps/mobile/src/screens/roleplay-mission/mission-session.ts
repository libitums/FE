// 미션 한 판의 순수 상태 기계입니다(PRD §3.3 ~ §3.6, 파이프라인 문서 §10.4) — UI를 import하지 않습니다.
// 턴의 SSE는 메신저 턴 리듀서(`applyTurnEvent`)로 접고, 그 리듀서가 모르는 `mission` 이벤트(목표 진척 · 남은 턴 · 끝 · 필수 달성)만
// 여기서 읽습니다. 필수를 이룬 채 판이 열려 있으면 「Mission success!」 카드(계속하기 / 끝내기)를 한 번 띄웁니다.
// 변화가 없으면 같은 참조를 돌려줍니다 — 늦게 온 응답 · 두 번 누른 버튼이 상태를 흔들지 않습니다.

import { applyTurnEvent, endTurn, initialTurnState } from "../messenger-chat/companion-turn";
import type { TurnState } from "../messenger-chat/companion-turn";
import { mergeGoals, missionProgressOf } from "./mission-progress";
import type {
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
    requiredDone: false,
    successPrompt: "none",
    report: null,
    gradingFailure: null,
  };
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
    messageId: turn.assistantMessageId,
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
      const endReason = progress.ended ?? state.endReason;
      const requiredDone = state.requiredDone || progress.requiredDone;
      next = {
        ...state,
        goals: mergeGoals(state.goals, progress),
        turnsLeft: Math.min(state.turnsLeft, progress.turnsLeft),
        endReason,
        requiredDone,
        successPrompt:
          requiredDone && endReason === null && state.successPrompt === "none"
            ? "shown"
            : state.successPrompt,
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
            messageId: value.opening.messageId,
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
      // 다시 보내기면 보내지 못한 그 줄을 치웁니다 — 실패 줄이 남아 또 눌리는 일(같은 글 두 번 · 턴 두 번)을 막습니다.
      const kept =
        action.retryOf === undefined
          ? state.lines
          : state.lines.filter(
              (entry) => !(entry.kind === "me" && entry.id === action.retryOf && entry.failed),
            );
      return {
        ...state,
        phase: "awaiting",
        lines: [...kept, line],
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
    case "continue":
      return state.successPrompt === "shown" ? { ...state, successPrompt: "dismissed" } : state;
    case "finish-requested":
      // 답을 기다리는 중의 끝내기는 그만두기 확인에서만 옵니다 — 결선이 스트림을 끊고 부릅니다.
      return (state.phase === "talking" || state.phase === "awaiting") && canFinishOpen(state)
        ? {
            ...state,
            phase: "ended",
            endReason: "finish",
            successPrompt: "dismissed",
            hint: null,
            hintLoading: false,
            turn: null,
            turnLineId: null,
          }
        : state;
    case "pending-opened":
      return state.phase === "preview"
        ? {
            ...state,
            phase: "grading",
            conversationId: action.conversationId,
            gradingFailure: null,
          }
        : state;
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

const canFinishOpen = (state: MissionSessionState): boolean =>
  state.requiredDone && state.endReason === null;

/** 끝내기를 누를 수 있는가 — 내 차례이고 필수를 다 이뤘고 판이 열려 있을 때. */
export function canFinishMission(state: MissionSessionState): boolean {
  return state.phase === "talking" && canFinishOpen(state);
}

/** 힌트 버튼을 누를 수 있는가 — 대화 중이고 남은 힌트가 있고 받는 중이 아닐 때. */
export function canAskHint(state: MissionSessionState): boolean {
  return (
    (state.phase === "talking" || state.phase === "awaiting") &&
    state.hintsLeft > 0 &&
    !state.hintLoading
  );
}

export { mergeGoals, missionProgressOf, requiredGoalsDone } from "./mission-progress";
export type { MissionProgress } from "./mission-progress";
