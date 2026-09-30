// 쓰기 문항의 모양과 **음절 하나씩 쓰는 흐름**의 리듀서를 소유합니다. UI를 import하지 않습니다.
//
// 쓰기 학습형(`screens/writing`)과 최종 테스트의 쓰기 문항(`screens/episode-final`)이 같은 흐름을
// 씁니다 — 화면 폴더끼리는 값을 주고받지 않으므로 여기 둡니다. 흐름에 붙는 호스트 결선은
// `components/use-writing-practice.ts`가, 판정 규칙은 `writing-judge.ts`가 집니다.

import type { UiCopy } from "./ui-copy.contract";
import type { AnswerResult } from "./answer-result";
import type { Stroke } from "./handwriting-recognition";
import type { WritingJudgement, WritingPassCriterion } from "./writing-judge";

/**
 * 빈칸 문장 하나입니다 — `before` + 빈칸(음절들) + `after`. 학습자는 빈칸의 음절을 **하나씩**
 * 따라 씁니다. 빈칸 표시(`_ _ _`)는 화면이 음절 수로 그립니다.
 */
export type WritingQuestion = {
  readonly id: string;
  /** 빈칸 앞입니다. 빈칸이 문장 첫머리면 빈 문자열입니다. */
  readonly before: string;
  /**
   * 빈칸을 채우는 음절들이고 순서가 쓰는 순서입니다. 비어 있을 수 없습니다 — 쓸 것이 없는
   * 문항은 문항이 아닙니다. 한 칸에 한 음절입니다: 견주기 지표가 「안내를 얼마나 덮었나」라,
   * 두 글자를 한 판에 두면 하나만 잘 써도 비가 반쯤 나옵니다(`lib/handwriting-trace.ts`).
   */
  readonly syllables: readonly [string, ...string[]];
  /** 빈칸 뒤입니다. 문장 부호만이어도 됩니다. */
  readonly after: string;
  /** 문장 전체의 번역입니다. */
  readonly translation: string;
  /**
   * 이 문항의 통과 문턱입니다. 글자가 복잡하면(획이 많은 음절) 같은 솜씨에도 지표가 낮게
   * 나오므로 문항마다 덮어쓸 자리를 둡니다. 옵셔널이 아닙니다 — 대부분은 기본값
   * `writingPassCriterion`을 그대로 적습니다.
   */
  readonly passCriterion: WritingPassCriterion;
};

/**
 * 음절 하나의 국면입니다. 쓰는 중 → (견주기) 재는 중 → 판정 · 잴 수 없음 → (다음) 다음 음절의
 * 쓰는 중.
 */
export type WritingPhase = "writing" | "judging" | "judged" | "unmeasurable";

export type WritingSessionState = {
  /** 지금 쓰는 음절의 순번(0부터)입니다. 음절 수와 같아지면 문항을 다 쓴 것입니다. */
  readonly syllableIndex: number;
  readonly phase: WritingPhase;
  /** 지금 음절에 쓴 획입니다. 다음 음절로 가거나 지우면 비워집니다. */
  readonly strokes: readonly Stroke[];
  /** `judged`일 때의 판정입니다. 다른 국면에서는 `null`입니다. */
  readonly verdict: AnswerResult | null;
  /**
   * 지나간 음절의 판정입니다. **넘어갈 때의 판정**을 싣습니다 — 틀린 뒤 다시 써서 맞으면
   * 맞은 것으로 남습니다(따라 쓰기는 익히는 활동이라 첫 시도로 가르지 않습니다). 잴 수 없어
   * 넘어간 음절은 싣지 않습니다.
   */
  readonly results: readonly AnswerResult[];
};

export type WritingSessionAction =
  | { readonly type: "stroke"; readonly stroke: Stroke }
  | { readonly type: "clear" }
  | { readonly type: "check" }
  | { readonly type: "judgement"; readonly judgement: WritingJudgement }
  // 틀린 뒤 획을 지우고 같은 음절을 다시 씁니다.
  | { readonly type: "retry" }
  | { readonly type: "next" };

export const initialWritingSessionState: WritingSessionState = {
  syllableIndex: 0,
  phase: "writing",
  strokes: [],
  verdict: null,
  results: [],
};

// 변화가 없으면 같은 참조를 돌려줍니다 — 늦게 온 견주기 답 · 두 번 누른 버튼이 상태를 흔들지
// 않습니다. 국면이 맞지 않는 동작은 전부 무시합니다: 판정이 선 판에 획이 더해지거나, 재는 중에
// 지워져 「지운 판의 점수」가 서는 일을 막습니다.
export function writingSessionReducer(
  state: WritingSessionState,
  action: WritingSessionAction,
): WritingSessionState {
  switch (action.type) {
    case "stroke": {
      return state.phase === "writing"
        ? { ...state, strokes: [...state.strokes, action.stroke] }
        : state;
    }
    case "clear": {
      return state.phase === "writing" && state.strokes.length > 0
        ? { ...state, strokes: [] }
        : state;
    }
    case "check": {
      return state.phase === "writing" && state.strokes.length > 0
        ? { ...state, phase: "judging" }
        : state;
    }
    case "judgement": {
      if (state.phase !== "judging") {
        return state;
      }
      const { judgement } = action;
      switch (judgement.kind) {
        case "judged": {
          return { ...state, phase: "judged", verdict: judgement.result };
        }
        case "unmeasurable": {
          return { ...state, phase: "unmeasurable" };
        }
        // 획은 남겨 둡니다 — 호스트가 못 받았을 뿐 학습자는 썼고, 지우면 쓴 것을 잃습니다.
        case "rewrite": {
          return { ...state, phase: "writing" };
        }
      }
    }
    // 맞은 음절은 다시 쓰지 않습니다 — 되돌릴 까닭이 없고, 열어 두면 맞은 판정을 지우는 길이
    // 생깁니다.
    case "retry": {
      return state.phase === "judged" && state.verdict === "incorrect"
        ? { ...state, phase: "writing", strokes: [], verdict: null }
        : state;
    }
    case "next": {
      if (state.phase !== "judged" && state.phase !== "unmeasurable") {
        return state;
      }
      return {
        syllableIndex: state.syllableIndex + 1,
        phase: "writing",
        strokes: [],
        verdict: null,
        results: state.verdict === null ? state.results : [...state.results, state.verdict],
      };
    }
  }
}

/** 지금 쓸 음절입니다. 문항을 다 썼으면 `null`입니다. */
export function currentWritingSyllable(
  state: WritingSessionState,
  question: WritingQuestion,
): string | null {
  return question.syllables[state.syllableIndex] ?? null;
}

/** 지금 음절이 마지막인가입니다 — 마지막 음절의 `다음`은 문항을 끝냅니다. */
export function isLastWritingSyllable(
  state: WritingSessionState,
  question: WritingQuestion,
): boolean {
  return state.syllableIndex >= question.syllables.length - 1;
}

/** 빈칸 표시입니다 — 음절 수만큼의 밑줄을 한 칸씩 띄웁니다(`_ _ _`). */
export function writingBlank(question: WritingQuestion): string {
  return question.syllables.map(() => "_").join(" ");
}

/** 보조기술이 읽는 문장입니다. 밑줄 대신 「빈칸」이라고 읽힙니다. */
export function writingPromptLabel(question: WritingQuestion, copy: UiCopy): string {
  return [question.before.trim(), copy.common.blank, question.after.trim()]
    .filter((part) => part !== "")
    .join(", ");
}
