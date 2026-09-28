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

// 낱말로 가릅니다. 문장 부호는 인식기가 붙이기도 하고 안 붙이기도 해서 떼고 봅니다.
function words(text: string): string[] {
  return text
    .replace(/[.,!?~…"'“”‘’]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

export function speakingWords(sentence: string): readonly string[] {
  return words(sentence);
}

/**
 * 앞에서부터 **연달아** 맞은 낱말 수입니다. 화면은 이 수만큼 앞 낱말을 칠합니다 — 「어디까지
 * 말했나」를 보이는 값이라, 중간에 틀린 낱말 뒤는 맞아도 세지 않습니다.
 */
export function matchedWordCount(sentence: string, recognized: string): number {
  const target = words(sentence);
  const heard = words(recognized);
  let count = 0;
  while (count < target.length && heard[count] === target[count]) {
    count += 1;
  }
  return count;
}

/** 문장의 낱말을 전부 맞게 말했으면 정답입니다. */
export function judgeSpeaking(sentence: string, recognized: string): AnswerResult {
  return matchedWordCount(sentence, recognized) === words(sentence).length
    ? "correct"
    : "incorrect";
}

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
