// 단어 선택 · 문화 확인이 답한 뒤 어떻게 이어지는가를 고르는 순수 함수입니다.

import type { AnswerResult } from "../../lib/answer-result";
import { questionDensityOf, type LearningDensity } from "../../lib/learning-density";
import type { UiCopy } from "../../lib/ui-copy.contract";
import type { QuestionOptionsState } from "../../components/question-options";
import type {
  LearningShellFeedback,
  LearningShellFeedbackLine,
} from "../learning/learning-shell-props";
import { hasAnswered, judgeWordChoice } from "./word-choice";
import type { WordChoiceSessionState } from "./word-choice";
import type { WordChoicePictureState } from "./word-choice-picture";
import type { WordChoiceQuestion } from "./word-choice-questions";

/** 답한 뒤: 잠깐 보이고 저절로 넘김(`advance`) 또는 해설 판을 세우고 Continue를 기다림(`explain`). */
export type WordChoiceAfterAnswer = "advance" | "explain";

/** 문화 확인(해설이 있는 문항)만 해설 판을 세웁니다. */
export function wordChoiceAfterAnswerOf(question: WordChoiceQuestion): WordChoiceAfterAnswer {
  return question.culture === undefined ? "advance" : "explain";
}

/** 장면 문항과 질문 카드 문항은 제목 문구가 다릅니다. 문화 확인이 아니면 `undefined`입니다. */
export function cultureFeedbackOf(
  question: WordChoiceQuestion,
  result: AnswerResult,
  copy: UiCopy,
): LearningShellFeedback | undefined {
  const { culture } = question;
  if (culture === undefined) return undefined;
  const titles = copy.wordChoice.culture.feedbackTitle;
  const lines: LearningShellFeedbackLine[] = [];
  if (culture.explanation.en !== undefined) {
    lines.push({ text: culture.explanation.en, lang: "en" });
  }
  if (culture.explanation.ko !== undefined) {
    lines.push({ text: culture.explanation.ko, lang: "ko" });
  }
  return {
    tone: result,
    title: (culture.scene === null ? titles.question : titles.scene)[result],
    lines,
  };
}

/** 답하는 순간 한 번 낭독할 문장입니다(제목 + 첫 영어 줄). */
export function cultureFeedbackAnnouncement(feedback: LearningShellFeedback): string {
  const english = feedback.lines.find((line) => line.lang === "en");
  return english === undefined ? feedback.title : `${feedback.title}. ${english.text}`;
}

/** 그림을 기다리는 동안은 waiting, 답한 뒤는 judged(해설 판이 서면 나머지를 접음), 그 밖은 open입니다. */
export function wordChoiceOptionsStateOf(
  question: WordChoiceQuestion,
  state: WordChoiceSessionState,
  picture: WordChoicePictureState,
): QuestionOptionsState {
  if (question.picture !== undefined && picture === "loading") return { kind: "waiting" };
  const selected = state.selectedChoiceIndex;
  if (!hasAnswered(state) || selected === null) return { kind: "open" };
  return {
    kind: "judged",
    index: selected,
    result: judgeWordChoice(question, selected),
    rest: wordChoiceAfterAnswerOf(question) === "explain" ? "collapsed" : "disabled",
  };
}

/** 장면 대사가 긴 문항(25자 이상)은 기기와 무관하게 compact로 내립니다. */
export function wordChoiceQuestionDensityOf(
  device: LearningDensity,
  question: WordChoiceQuestion,
): LearningDensity {
  const line = question.culture?.scene?.line.ko;
  return questionDensityOf(device, line !== undefined && line.length >= 25 ? "long" : "regular");
}
