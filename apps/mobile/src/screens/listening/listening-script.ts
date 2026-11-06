// 듣기 제시의 대본 갈래와 문항 밀도를 고르는 순수 함수입니다.

import { questionDensityOf, type LearningDensity } from "../../lib/learning-density";
import type { ListeningQuestion } from "./listening-questions";
import { listeningPromptScale } from "./listening-prompt-scale";

/** 제시 카드 안 대본 자리: 없음 · 한글 + 로마자. */
export type ListeningScript = "none" | "full";

/** 대본을 열었거나(`showTranscript`) 답한 뒤(`revealed`)면 한글 + 로마자, 아니면 없음입니다. */
export function listeningScriptOf(input: {
  readonly showTranscript: boolean;
  readonly revealed: boolean;
}): ListeningScript {
  return input.showTranscript || input.revealed ? "full" : "none";
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
