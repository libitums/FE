// 쓰기 학습형 화면의 문항 표와 **문항 사이**의 흐름을 소유합니다. UI를 import하지 않습니다.
//
// 문항 **안**의 흐름(음절 하나씩 쓰기 · 견주기 · 판정)은 최종 테스트와 함께 쓰는 공용 핵심이
// 집니다(`lib/writing-session.ts` · `lib/writing-judge.ts`). 여기 남는 것은 이 화면만의 것 —
// 몇째 문항인가와 문항마다의 결과입니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { AnswerResult } from "../../lib/answer-result";
import { writingPassCriterion } from "../../lib/writing-judge";
import type { WritingQuestion } from "../../lib/writing-session";
import type { JourneyStepId } from "../journey-map/journey-map";

/**
 * 문항 표입니다.
 *
 * ⚠ **이음매입니다**(`docs/conventions/code.md` 「임시 입력값의 이음매」). **무엇이 임시인가** —
 * `directions`의 세 문항 값 전부입니다. 스텝의 주제(길 묻기)를 따라 지은 것이고, 빈칸은 두
 * 음절짜리로 골랐습니다 — 한 문항이 한 화면 안에서 끝나는 길이입니다. **무엇이 막고 있나** —
 * 컨텐츠 공급 경로가 정해지지 않았습니다. **값이 오는 날 무엇이 바뀌나** — 이 표의 값과,
 * 배정이 옮겨 가면 `learningFormsByStep`의 그 줄입니다. 문항 모양(`WritingQuestion`)은 임시가
 * 아닙니다. 배정과 문항은 함께 움직여야 하고, 어긋나면 교차 불변식이 먼저 빨개집니다.
 *
 * 문턱은 전부 기본값입니다 — 문항마다 덮어쓸 근거(글자별 실측)가 아직 없습니다.
 */
const writingQuestionsByStep: Record<JourneyStepId, readonly WritingQuestion[]> = {
  "tutorial-listening": [],
  "tutorial-speaking": [],
  "tutorial-writing": [
    {
      id: "tutorial-trace-na",
      before: "내일 만",
      syllables: ["나"],
      after: "요",
      translation: "See you tomorrow.",
      instruction: "Trace the pale letter 나 (na) with your finger. You can skip for now.",
      optionalPractice: true,
      passCriterion: writingPassCriterion,
    },
  ],
  greeting: [],
  introduction: [],
  ordering: [],
  appointment: [],
  directions: [
    {
      id: "where-is-station",
      before: "역이 ",
      syllables: ["어", "디"],
      after: "예요?",
      translation: "Where is the station?",
      passCriterion: writingPassCriterion,
    },
    {
      id: "go-straight",
      before: "쭉 ",
      syllables: ["가", "세"],
      after: "요.",
      translation: "Go straight.",
      passCriterion: writingPassCriterion,
    },
    {
      id: "is-it-far",
      before: "여기서 ",
      syllables: ["멀", "어"],
      after: "요?",
      translation: "Is it far from here?",
      passCriterion: writingPassCriterion,
    },
  ],
};

export function writingQuestionsForStep(id: JourneyStepId): readonly WritingQuestion[] {
  return writingQuestionsByStep[id];
}

/** 문항 사이의 상태입니다. 문항 안의 상태는 공용 훅이 따로 듭니다. */
export type WritingScreenState = {
  readonly questionIndex: number;
  /**
   * 끝낸 문항의 결과입니다. 잰 음절이 하나도 없던 문항(호스트 없음 · 잴 수 없음)은 **싣지
   * 않습니다** — 기기 탓을 학습자의 오답으로 접지 않습니다(말하기와 같은 규칙입니다).
   */
  readonly results: readonly AnswerResult[];
};

export const initialWritingScreenState: WritingScreenState = { questionIndex: 0, results: [] };

/** 문항 하나를 끝냅니다. `result`가 `null`이면 결과에 싣지 않고 다음 문항으로만 갑니다. */
export function finishWritingQuestion(
  state: WritingScreenState,
  result: AnswerResult | null,
): WritingScreenState {
  return {
    questionIndex: state.questionIndex + 1,
    results: result === null ? state.results : [...state.results, result],
  };
}

export function writingCompletionAnnouncement(nextActionLabel: string, copy: UiCopy): string {
  return `${copy.common.allQuestionsDone}, ${nextActionLabel}`;
}
