// 듣기 제시의 대본 갈래와 문항 밀도를 고르는 순수 함수입니다.

import { questionDensityOf, type LearningDensity } from "../../lib/learning-density";
import type { ListeningBeforeAnswer, ListeningQuestion } from "./listening-questions";
import { listeningPromptScale } from "./listening-prompt-scale";

/** 제시 카드 안 대본 자리: 없음 · 로마자만 · 한글 + 로마자. */
export type ListeningScript = "none" | "romanization" | "full";

/** 대본을 열었거나(`showTranscript`) 답한 뒤(`revealed`)면 한글 + 로마자, 아니면 답하기 전 갈래를 따릅니다. */
export function listeningScriptOf(input: {
  readonly beforeAnswer: ListeningBeforeAnswer;
  readonly showTranscript: boolean;
  readonly revealed: boolean;
}): ListeningScript {
  if (input.showTranscript || input.revealed) return "full";
  return input.beforeAnswer === "romanization" ? "romanization" : "none";
}

/** 제시문이 긴 문항(25자 이상)은 기기와 무관하게 compact로 내립니다. */
export function listeningQuestionDensityOf(
  device: LearningDensity,
  question: ListeningQuestion,
): LearningDensity {
  return questionDensityOf(
    device,
    listeningPromptScale(question.prompt) === "s" ? "long" : "regular",
  );
}
