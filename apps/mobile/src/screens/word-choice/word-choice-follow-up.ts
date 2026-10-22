// 단어 선택 · 문화 확인이 답한 뒤 어떻게 이어지는가를 고르는 순수 함수입니다. 껍데기만 있는 단계입니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { LearningDensity } from "../../lib/learning-density";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { QuestionOptionsState } from "../../components/question-options";
import type { LearningShellFeedback } from "../learning/learning-shell-props";
import type { WordChoiceSessionState } from "./word-choice";
import type { WordChoicePictureState } from "./word-choice-picture";
import type { WordChoiceQuestion } from "./word-choice-questions";

/** 답한 뒤: 잠깐 보이고 저절로 넘김(`advance`) 또는 해설 판을 세우고 Continue를 기다림(`explain`). */
export type WordChoiceAfterAnswer = "advance" | "explain";

export function wordChoiceAfterAnswerOf(_question: WordChoiceQuestion): WordChoiceAfterAnswer {
  return "advance";
}

export function cultureFeedbackOf(
  _question: WordChoiceQuestion,
  _result: AnswerResult,
  _copy: UiCopy,
): LearningShellFeedback | undefined {
  return undefined;
}

/** 답하는 순간 한 번 낭독할 문장입니다(제목 + 첫 영어 줄). */
export function cultureFeedbackAnnouncement(feedback: LearningShellFeedback): string {
  return feedback.title;
}

export function wordChoiceOptionsStateOf(
  _question: WordChoiceQuestion,
  _state: WordChoiceSessionState,
  _picture: WordChoicePictureState,
): QuestionOptionsState {
  return { kind: "open" };
}

/** 장면 대사가 긴 문항은 기기와 무관하게 compact로 내립니다. */
export function wordChoiceQuestionDensityOf(
  device: LearningDensity,
  _question: WordChoiceQuestion,
): LearningDensity {
  return device;
}
