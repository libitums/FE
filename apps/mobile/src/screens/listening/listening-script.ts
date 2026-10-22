// 듣기 제시의 대본 갈래와 문항 밀도를 고르는 순수 함수입니다. 껍데기만 있는 단계입니다.

import type { LearningDensity } from "../../lib/learning-density";
import type { ListeningBeforeAnswer, ListeningQuestion } from "./listening-questions";

/** 제시 카드 안 대본 자리: 없음 · 로마자만 · 한글 + 로마자. */
export type ListeningScript = "none" | "romanization" | "full";

export function listeningScriptOf(_input: {
  readonly beforeAnswer: ListeningBeforeAnswer;
  readonly showTranscript: boolean;
  readonly revealed: boolean;
}): ListeningScript {
  return "none";
}

/** 제시문이 긴 문항은 기기와 무관하게 compact로 내립니다. */
export function listeningQuestionDensityOf(
  device: LearningDensity,
  _question: ListeningQuestion,
): LearningDensity {
  return device;
}
