// 에피소드 롤플레이의 순수 로직입니다 — 말하기 판정 · 턴 진행 · 표지 컷 잇기. UI를 import하지 않습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { SpeechStatus } from "../../lib/speech-recognition";
import type { CatalogCuts } from "../catalog-cover/catalog-cover.contract";
import type {
  RoleplayTalkAction,
  RoleplayTalkState,
  SpeechReadiness,
} from "./roleplay-story.contract";

export const initialRoleplayTalkState: RoleplayTalkState = {
  turnIndex: 0,
  phase: "ready",
  heard: "",
  verdict: null,
  hintShown: false,
  unavailableReason: null,
  results: [],
  skippedCount: 0,
};

const nextTurn = (state: RoleplayTalkState, results: readonly AnswerResult[], skipped: number) => ({
  ...initialRoleplayTalkState,
  turnIndex: state.turnIndex + 1,
  results,
  skippedCount: state.skippedCount + skipped,
});

// 변화가 없으면 같은 참조를 돌려줍니다 — 늦게 온 인식 결과 · 두 번 누른 버튼이 상태를 흔들지 않습니다.
export function roleplayTalkReducer(
  state: RoleplayTalkState,
  action: RoleplayTalkAction,
): RoleplayTalkState {
  switch (action.type) {
    case "start":
      return state.phase === "ready" || state.phase === "unavailable"
        ? { ...state, phase: "listening", unavailableReason: null }
        : state;
    case "heard":
      return state.phase === "listening"
        ? { ...state, phase: "heard", heard: action.text, verdict: action.verdict }
        : state;
    case "unavailable":
      return state.phase === "listening" || state.phase === "ready"
        ? { ...state, phase: "unavailable", unavailableReason: action.reason }
        : state;
    case "hint":
      return state.hintShown ? state : { ...state, hintShown: true };
    // 틀린 뒤 다시 말하기 — 판정을 지우고 준비로 돌아갑니다. 맞힌 뒤에는 다시 하지 않습니다.
    case "retry":
      return state.phase === "heard" && state.verdict === "incorrect"
        ? { ...state, phase: "ready", heard: "", verdict: null }
        : state;
    case "next":
      return state.phase === "heard" && state.verdict !== null
        ? nextTurn(state, [...state.results, state.verdict], 0)
        : state;
    // 말할 수 없음 · 인식 불가 — 판정 없이 넘깁니다. 듣는 중에는 받지 않습니다.
    case "skip":
      return state.phase === "listening" ? state : nextTurn(state, state.results, 1);
  }
}

/** 마지막 턴을 넘겼는가입니다. */
export function isRoleplayTalkDone(state: RoleplayTalkState, turnCount: number): boolean {
  return state.turnIndex >= turnCount;
}

// 말하기 답 판정은 `@libitums/episode-core/judge`가 정본입니다(랜딩 체험판과 같은 규칙).
export { judgeRoleplayReply } from "@libitums/episode-core/judge";

/**
 * 롤플레이 앞에 보일 표지 컷입니다. 표지의 마지막 컷이 첫 턴의 상대 대사와 같으면 그 컷은 첫 턴이
 * 대신하므로 뺍니다. 남는 컷이 없으면 `null` — 곧장 대화로 갑니다.
 */
export function roleplayStoryCutsOf(cuts: CatalogCuts, firstLine: string): CatalogCuts | null {
  const last = cuts[cuts.length - 1];
  const sameAsFirstTurn =
    last !== undefined && last.kind === "line" && last.text.ko.trim() === firstLine.trim();
  const kept = sameAsFirstTurn ? cuts.slice(0, -1) : [...cuts];
  const [first, ...rest] = kept;
  return first === undefined ? null : [first, ...rest];
}

/**
 * 시작 전 말하기 준비입니다. 아직 묻지 않은 권한이 하나라도 있으면 먼저 묻고(`ask`), 거부 · 제한이면 설정으로
 * 보내고(`blocked`), 권한은 있는데 인식기가 없으면 `unsupported`입니다.
 */
export function speechReadinessOf(status: SpeechStatus): SpeechReadiness {
  const permissions = [status.microphone, status.speechRecognition];
  if (permissions.includes("not-determined")) return "ask";
  if (permissions.some((state) => state !== "granted")) return "blocked";
  return status.recognizerAvailable ? "ready" : "unsupported";
}
