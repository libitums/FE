// 말하기 화면(Figma 65-282)의 순수 로직과 문항 표를 소유합니다. UI를 import하지 않습니다.
//
// 흐름은 문항마다 넷입니다 — 준비(`ready`) → 듣는 중(`listening`) → 판정(`judged`), 또는
// 인식을 쓸 수 없음(`unavailable`). 인식 결과는 말하기를 멈출 때 **한 번** 옵니다
// (`lib/speech-recognition.ts`) — 그래서 낱말을 칠하는 것도 그 한 번의 결과로 합니다.

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

export type SpeakingQuestion = {
  /** 따라 말할 문장입니다. 낱말은 공백으로 가릅니다. */
  readonly sentence: string;
  /** 발음 표기입니다 — 대괄호까지 값에 담습니다(`[i.ɡʌ.ju.se.jo]`). */
  readonly romanization: string;
};

/**
 * 문항 표입니다. 말하기가 배정된 스텝(이름 묻기)에만 **임시 문항**을 둡니다 — 컨텐츠 공급
 * 경로가 정해지지 않았고, 값은 스텝의 주제(자기소개)를 따라 지은 것입니다. 컨텐츠가 오면
 * 이 표만 갈립니다.
 */
export const speakingQuestionsByStep: Record<JourneyStepId, readonly SpeakingQuestion[]> = {
  greeting: [],
  introduction: [
    { sentence: "제 이름은 민수예요", romanization: "[je.i.reu.meun.min.su.ye.yo]" },
    { sentence: "만나서 반가워요", romanization: "[man.na.seo.ban.ga.wo.yo]" },
    { sentence: "잘 부탁드려요", romanization: "[jal.bu.tak.deu.ryeo.yo]" },
  ],
  ordering: [],
  appointment: [],
  directions: [],
};

export function speakingQuestionsForStep(id: JourneyStepId): readonly SpeakingQuestion[] {
  return speakingQuestionsByStep[id];
}

// 채점 규칙은 `lib/speaking-judge.ts`로 올라갔습니다 — 최종 테스트도 같은 규칙을 씁니다.
// 이 화면의 소비자가 한 자리에서 보도록 다시 내보냅니다.
export { judgeSpeaking, matchedWordCount, speakingWords } from "../../lib/speaking-judge";

export type SpeakingPhase = "ready" | "listening" | "judged" | "unavailable";

export type SpeakingSessionState = {
  readonly questionIndex: number;
  readonly phase: SpeakingPhase;
  /** 판정된 문항의 인식 문장입니다. 판정 전 · 인식을 못 쓴 문항은 빈 문자열입니다. */
  readonly recognized: string;
  /**
   * 지나간 문항의 결과입니다. 인식을 쓸 수 없어 건너뛴 문항은 **싣지 않습니다** — 판정이
   * 없는 것을 오답으로 접으면 기기 탓이 학습자 탓이 됩니다.
   */
  readonly results: readonly AnswerResult[];
};

export type SpeakingSessionAction =
  | { readonly type: "start" }
  | { readonly type: "recognized"; readonly text: string; readonly result: AnswerResult }
  | { readonly type: "unavailable" }
  // 사용자가 건너뜁니다. **말하기 전(`ready`)에만** 받습니다 — 듣는 중에 받으면 인식
  // 결과와 경합하고, 판정 뒤에 받으면 이미 실린 결과를 덮습니다.
  | { readonly type: "skip" }
  | { readonly type: "next" };

export const initialSpeakingSessionState: SpeakingSessionState = {
  questionIndex: 0,
  phase: "ready",
  recognized: "",
  results: [],
};

export function speakingSessionReducer(
  state: SpeakingSessionState,
  action: SpeakingSessionAction,
): SpeakingSessionState {
  switch (action.type) {
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
    case "skip": {
      // 자리 표시자입니다. 호출되면 입력을 그대로 돌려줍니다 — D7(나)의 실동작(`results`에
      // `"correct"`를 싣고 다음 문항으로 감)은 `logic` 변형이 채웁니다(logic-scaffold).
      return state;
    }
    case "next": {
      if (state.phase !== "judged" && state.phase !== "unavailable") {
        return state;
      }
      return {
        questionIndex: state.questionIndex + 1,
        phase: "ready",
        recognized: "",
        results: state.results,
      };
    }
  }
}

export function isSpeakingSessionComplete(state: SpeakingSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

/** 채점 발화입니다 — 문장 만들기 · 듣기와 같은 형태입니다. */
export function speakingAnnouncement(result: AnswerResult): string {
  return `채점 결과, ${answerResultLabel(result)}`;
}

export const speakingCompletionText = "문항을 모두 마쳤어요";
export const speakingFinishLabel = "결과 보기";

export function speakingCompletionAnnouncement(nextActionLabel: string): string {
  return `${speakingCompletionText}, ${nextActionLabel}`;
}
