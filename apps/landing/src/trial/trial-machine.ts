// 체험판 흐름의 순수 리듀서입니다. 판정 · 전이는 여기서만 정하고, 화면 코드는 결과를 그리기만 합니다.
// 바뀔 것이 없는 행동(늦게 온 인식 결과 · 연타 · 다른 단계의 행동)은 같은 참조를 돌려줍니다.

import {
  canCheckTiles,
  catalogPassCriterion,
  judgeAssessment,
  judgeChoice,
  judgeSpokenLenient,
  judgeTileReply,
} from "@libitums/episode-core/judge";

import type {
  InitialTrialState,
  ReduceTrial,
  SpeechAvailability,
  SpeechFailure,
  TrialAction,
  TrialFunnelStep,
  TrialState,
  TrialTurnState,
} from "./trial-machine.contract";
import type { TrialModel } from "./trial-model.contract";

/** 턴 `index`의 처음 — 말하기가 되면 speech, 아니면 타일(안 되는 까닭을 안내로). */
function turnOf(index: number, speech: SpeechAvailability): TrialTurnState {
  return {
    index,
    mode: speech === "supported" ? "speech" : "tiles",
    phase: "ready",
    heard: "",
    placed: [],
    verdict: null,
    hintShown: false,
    notice: speech === "supported" ? null : speech,
    spoken: null,
  };
}

const freshChoice = { selected: null, verdict: null } as const;

/** 연 화면 상태 — 표지 없이 컷 1. 말하기 지원은 첫 탭(begin)이 정하고, 그 전 speech는 자리값입니다. */
export const initialTrialState: InitialTrialState = () => ({
  step: "prologue",
  cutIndex: 0,
  begun: false,
  choice: freshChoice,
  cultureFace: "front",
  speech: "unsupported",
  roleplay: { turn: turnOf(0, "unsupported"), records: [], verdict: null },
  reached: [],
});

/** 단계를 옮기고, 처음 닿은 funnel 단계면 `reached`에 쌓습니다. */
function enter(state: TrialState, step: TrialFunnelStep, patch: Partial<TrialState> = {}) {
  const reached = state.reached.includes(step) ? state.reached : [...state.reached, step];
  return { ...state, ...patch, step, reached };
}

function withTurn(state: TrialState, turn: TrialTurnState, patch: Partial<TrialState> = {}) {
  return { ...state, ...patch, roleplay: { ...state.roleplay, turn } };
}

function reduceCuts(state: TrialState, model: TrialModel): TrialState {
  const prologue = state.step === "prologue";
  const cuts = prologue ? model.prologue : model.epilogue;
  if (state.cutIndex + 1 < cuts.length) return { ...state, cutIndex: state.cutIndex + 1 };
  return prologue ? enter(state, "vocab") : enter(state, "clear");
}

/** 첫 탭 — 말하기 지원을 정하고 지금 단계에 닿은 것으로 칩니다. 두 번째부터는 같은 참조. */
function begin(state: TrialState, speech: "supported" | "unsupported"): TrialState {
  if (state.begun) return state;
  return enter({ ...state, begun: true, speech }, state.step);
}

function reduceChoice(state: TrialState, action: TrialAction, model: TrialModel): TrialState {
  const item = state.step === "image-match" ? model.imageMatch : model.replySelect;
  if (action.type === "choose") {
    const index = action.optionIndex;
    if (state.choice.verdict !== null || index < 0 || index >= item.options.length) return state;
    return { ...state, choice: { selected: index, verdict: judgeChoice(item.answerIndex, index) } };
  }
  if (action.type !== "next" || state.choice.verdict === null) return state;
  return state.step === "image-match"
    ? enter(state, "reply-select", { choice: freshChoice })
    : enter(state, "culture", { choice: freshChoice, cultureFace: "front" });
}

function reduceSpeechFailure(state: TrialState, reason: SpeechFailure): TrialState {
  const { turn } = state.roleplay;
  if (reason === "no-speech") {
    if (turn.phase !== "listening") return state;
    return withTurn(state, { ...turn, phase: "judged", heard: "", verdict: "incorrect" });
  }
  if (reason === "aborted") {
    return turn.phase === "listening" ? withTurn(state, { ...turn, phase: "ready" }) : state;
  }
  if (turn.phase === "judged") return state;
  const tiles = {
    ...turn,
    mode: "tiles",
    phase: "ready",
    heard: "",
    placed: [],
    notice: reason,
  } as const;
  // 거부 · 미지원은 남은 턴 전부를 타일로, 일시 실패(unavailable)는 이 턴만 바꿉니다.
  return reason === "unavailable"
    ? withTurn(state, tiles)
    : withTurn(state, tiles, { speech: reason });
}

function reduceSpeech(state: TrialState, action: TrialAction, model: TrialModel): TrialState {
  const { turn } = state.roleplay;
  const item = model.roleplay.turns[turn.index];
  if (item === undefined) return state;
  switch (action.type) {
    case "speak":
      return turn.phase === "ready" ? withTurn(state, { ...turn, phase: "listening" }) : state;
    case "heard": {
      if (turn.phase !== "listening") return state;
      // 발음 기준 판정 — 앱 규칙으로 맞으면 strict, 소리가 가까우면 lenient. 둘 다 화면에서는 Great입니다.
      const spoken = judgeSpokenLenient(item.accepted, action.alternatives);
      const verdict = spoken.outcome === "incorrect" ? "incorrect" : "correct";
      return withTurn(state, { ...turn, phase: "judged", heard: spoken.heard, verdict, spoken });
    }
    case "speech-failed":
      return reduceSpeechFailure(state, action.reason);
    case "retry":
      return turn.phase === "judged" && turn.verdict === "incorrect"
        ? withTurn(state, { ...turn, phase: "ready", heard: "", verdict: null, spoken: null })
        : state;
    case "cant-speak": {
      const canSwitch =
        turn.phase === "ready" || (turn.phase === "judged" && turn.verdict === "incorrect");
      if (!canSwitch) return state;
      return withTurn(state, {
        ...turn,
        mode: "tiles",
        phase: "ready",
        heard: "",
        placed: [],
        verdict: null,
        notice: null,
        spoken: null,
      });
    }
    default:
      return state;
  }
}

function reduceTiles(state: TrialState, action: TrialAction, model: TrialModel): TrialState {
  const { turn } = state.roleplay;
  const item = model.roleplay.turns[turn.index];
  if (item === undefined || turn.phase !== "ready") return state;
  if (action.type === "toggle-tile") {
    const index = action.tileIndex;
    if (index < 0 || index >= item.tiles.length) return state;
    const placed = turn.placed.includes(index)
      ? turn.placed.filter((placedIndex) => placedIndex !== index)
      : [...turn.placed, index];
    return withTurn(state, { ...turn, placed });
  }
  if (action.type !== "check" || !canCheckTiles(item.tiles, turn.placed)) return state;
  const verdict = judgeTileReply(item.tiles, turn.placed, item.accepted);
  return withTurn(state, { ...turn, phase: "judged", verdict });
}

/** 판정된 턴을 넘깁니다 — 말하기는 맞혔을 때만. 마지막 턴 뒤에는 결과와 무관하게 엔딩으로 갑니다. */
function nextTurn(state: TrialState, model: TrialModel): TrialState {
  const { turn } = state.roleplay;
  if (turn.phase !== "judged" || turn.verdict === null) return state;
  if (turn.mode === "speech" && turn.verdict !== "correct") return state;
  const records = [...state.roleplay.records, { result: turn.verdict, mode: turn.mode }];
  const turns = model.roleplay.turns;
  if (turn.index + 1 < turns.length) {
    return {
      ...state,
      roleplay: { turn: turnOf(turn.index + 1, state.speech), records, verdict: null },
    };
  }
  const results = records.map((record) => record.result);
  const verdict = judgeAssessment(results, catalogPassCriterion(turns.length));
  return enter(state, "epilogue", { cutIndex: 0, roleplay: { turn, records, verdict } });
}

function reduceRoleplay(state: TrialState, action: TrialAction, model: TrialModel): TrialState {
  const { turn } = state.roleplay;
  if (action.type === "next") return nextTurn(state, model);
  if (action.type === "hint") {
    return turn.hintShown ? state : withTurn(state, { ...turn, hintShown: true });
  }
  return turn.mode === "speech"
    ? reduceSpeech(state, action, model)
    : reduceTiles(state, action, model);
}

/** 행동 하나 → 새 상태. 바뀔 것이 없으면 같은 참조. */
export const reduceTrial: ReduceTrial = (state, action, model) => {
  if (action.type === "begin") return begin(state, action.speech);
  switch (state.step) {
    case "prologue":
    case "epilogue":
      return action.type === "next" ? reduceCuts(state, model) : state;
    case "vocab":
      return action.type === "next" ? enter(state, "image-match", { choice: freshChoice }) : state;
    case "image-match":
    case "reply-select":
      return reduceChoice(state, action, model);
    case "culture":
      if (action.type === "flip") {
        return { ...state, cultureFace: state.cultureFace === "front" ? "back" : "front" };
      }
      return action.type === "next"
        ? enter(state, "roleplay", {
            roleplay: { turn: turnOf(0, state.speech), records: [], verdict: null },
          })
        : state;
    case "roleplay":
      return reduceRoleplay(state, action, model);
    case "clear":
      // Episode clear 배너(유지 시간 · 탭) 다음은 곧바로 완료(사전 등록)입니다.
      return action.type === "next" ? enter(state, "complete") : state;
    case "complete":
      return state;
  }
};
