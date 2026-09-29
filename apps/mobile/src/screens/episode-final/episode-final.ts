// 에피소드 최종 테스트의 순수 로직입니다. UI를 import하지 않습니다.
//
// 문항마다 흐름은 셋입니다 — 준비(`ready`) → 판정(`judged`) → 잠시 뒤 저절로 다음. 말하기
// 문항은 그 사이에 듣는 중(`listening`)을 지나고, 인식을 쓸 수 없으면 판정 없이
// `unavailable`에서 건너뜁니다. **틀려도 다음으로 갑니다** — 정답을 보여 주고 넘어가며, 몇 개
// 맞혔는지는 끝난 뒤의 학습 완료 화면이 보입니다(2026-09-28 결정).
//
// 판정 뒤에는 `Next`를 누르지 않습니다 — 서사가 저절로 이어지듯 잠시 뒤 다음 문항으로
// 갑니다(2026-09-28 결정).

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { AnswerResult } from "../../lib/answer-result";
import type {
  EpisodeFinalCallLine,
  EpisodeFinalCallTurn,
  EpisodeFinalWordChoiceQuestion,
} from "./episode-final.contract";

export type EpisodeFinalPhase = "ready" | "listening" | "judged" | "unavailable";

export type EpisodeFinalSessionState = {
  readonly questionIndex: number;
  readonly phase: EpisodeFinalPhase;
  /** 낱말 고르기에서 고른 보기입니다. 고르기 전 · 말하기 문항에서는 `null`입니다. */
  readonly chosenIndex: number | null;
  /** 말하기에서 인식한 문장입니다. 판정 전 · 낱말 고르기 문항에서는 빈 문자열입니다. */
  readonly recognized: string;
  /**
   * 지나간 문항의 결과입니다. 인식을 쓸 수 없어 건너뛴 문항은 **싣지 않습니다** — 판정이
   * 없는 것을 오답으로 접으면 기기 탓이 학습자 탓이 됩니다(말하기 학습형과 같습니다).
   */
  readonly results: readonly AnswerResult[];
};

export type EpisodeFinalSessionAction =
  | { readonly type: "choose"; readonly optionIndex: number; readonly result: AnswerResult }
  | { readonly type: "start" }
  | { readonly type: "recognized"; readonly text: string; readonly result: AnswerResult }
  | { readonly type: "unavailable" }
  // `Can't speak`(지금은 말할 수 없음)입니다. 말하기 전(`ready`)에만 받고, 판정 없이 다음 문항으로
  // 갑니다 — 결과에 싣지 않습니다. 말할 수 없는 자리를 오답으로 접지 않습니다.
  | { readonly type: "skip" }
  // 쓰기 문항을 다 썼습니다. 쓰기는 음절마다 판정과 `Next`를 문항 **안**에서 지나므로(공용 핵심
  // `lib/writing-session.ts`) 이 세션에는 판정 국면 없이 결과와 넘김이 한 번에 옵니다 — 이미
  // 누르고 넘어온 것을 다시 기다리게 하지 않습니다. `result`가 `null`이면 잰 음절이 없던
  // 것이라 결과에 싣지 않습니다.
  | { readonly type: "written"; readonly result: AnswerResult | null }
  | { readonly type: "next" };

export const initialEpisodeFinalSessionState: EpisodeFinalSessionState = {
  questionIndex: 0,
  phase: "ready",
  chosenIndex: null,
  recognized: "",
  results: [],
};

// 변화가 없으면 같은 참조를 돌려줍니다 — 늦게 온 인식 결과 · 두 번 누른 보기가 상태를
// 흔들지 않습니다.
export function episodeFinalSessionReducer(
  state: EpisodeFinalSessionState,
  action: EpisodeFinalSessionAction,
): EpisodeFinalSessionState {
  switch (action.type) {
    case "choose": {
      if (state.phase !== "ready") {
        return state;
      }
      return {
        ...state,
        phase: "judged",
        chosenIndex: action.optionIndex,
        results: [...state.results, action.result],
      };
    }
    case "start": {
      return state.phase === "ready" ? { ...state, phase: "listening" } : state;
    }
    case "recognized": {
      if (state.phase !== "listening") {
        return state;
      }
      return {
        ...state,
        phase: "judged",
        recognized: action.text,
        results: [...state.results, action.result],
      };
    }
    case "unavailable": {
      return state.phase === "ready" || state.phase === "listening"
        ? { ...state, phase: "unavailable" }
        : state;
    }
    case "written": {
      if (state.phase !== "ready") {
        return state;
      }
      return {
        ...initialEpisodeFinalSessionState,
        questionIndex: state.questionIndex + 1,
        results: action.result === null ? state.results : [...state.results, action.result],
      };
    }
    case "skip":
    case "next": {
      const allowed =
        action.type === "skip"
          ? state.phase === "ready"
          : state.phase === "judged" || state.phase === "unavailable";
      if (!allowed) {
        return state;
      }
      return {
        questionIndex: state.questionIndex + 1,
        phase: "ready",
        chosenIndex: null,
        recognized: "",
        results: state.results,
      };
    }
  }
}

/** 통화 최종 테스트에서 상대 대사 한 줄이 머무는 시간입니다 — 서사 통화와 같은 3초입니다. */
export const episodeFinalLineMs = 3000;

/** 판정을 보여 준 뒤 다음 문항으로 넘어가기까지입니다 — 말하기 학습형의 넘김과 같은 값입니다. */
export const episodeFinalAdvanceDelayMs = 2500;

export function judgeWordChoice(
  question: EpisodeFinalWordChoiceQuestion,
  optionIndex: number,
): AnswerResult {
  return optionIndex === question.answerIndex ? "correct" : "incorrect";
}

export type EpisodeFinalOptionState = "idle" | "correct" | "incorrect";

/**
 * 보기 하나의 모양입니다. 고르기 전에는 모두 `idle`이고, 고른 뒤에는 정답 보기가 늘
 * `correct`로 섭니다 — 틀렸을 때도 정답을 보여 주고 넘어가기 때문입니다. 고른 보기가
 * 틀렸으면 그 보기만 `incorrect`입니다.
 */
export function episodeFinalOptionState(
  question: EpisodeFinalWordChoiceQuestion,
  chosenIndex: number | null,
  optionIndex: number,
): EpisodeFinalOptionState {
  if (chosenIndex === null) {
    return "idle";
  }
  if (optionIndex === question.answerIndex) {
    return "correct";
  }
  return optionIndex === chosenIndex ? "incorrect" : "idle";
}

/** 빈칸 표시입니다 — 디자인의 `_ _ _`입니다. */
export const episodeFinalBlank = "_ _ _";

/**
 * 대화 패널에 서는 문장입니다. 고르기 전에는 빈칸이 비어 있고, 고른 뒤에는 **정답으로**
 * 채워집니다 — 틀렸어도 서사는 맞는 대사로 이어집니다.
 */
export function episodeFinalPromptLine(
  question: EpisodeFinalWordChoiceQuestion,
  judged: boolean,
): string {
  const blank = judged ? question.options[question.answerIndex] : episodeFinalBlank;
  return `${question.before}${blank}${question.after}`;
}

/** 보조기술이 읽는 문장입니다. 고르기 전에는 밑줄 셋 대신 「빈칸」이라고 읽힙니다. */
export function episodeFinalPromptLabel(
  question: EpisodeFinalWordChoiceQuestion,
  judged: boolean,
  copy: UiCopy,
): string {
  return judged
    ? episodeFinalPromptLine(question, true)
    : [question.before.trim(), copy.common.blank, question.after.trim()]
        .filter((part) => part !== "")
        .join(", ");
}

/** 몇째 문항인지입니다 — `1 / 5`. */
export function episodeFinalProgressLabel(questionIndex: number, total: number): string {
  return `${questionIndex + 1} / ${total}`;
}

/**
 * 지금 차례까지 가운데 **마지막 상대 대사**입니다. 내 차례에도 말풍선은 그 대사를 들고
 * 있습니다 — 무엇에 답하는지 남아 있어야 합니다. 아직 상대 대사가 없으면 `undefined`입니다.
 */
export function latestCallLine(
  turns: readonly EpisodeFinalCallTurn[],
  turnIndex: number,
): EpisodeFinalCallLine | undefined {
  for (let index = Math.min(turnIndex, turns.length - 1); index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.kind === "line") {
      return turn;
    }
  }
  return undefined;
}
