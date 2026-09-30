import type { AnswerResult } from "../../lib/answer-result";
import type { EpisodeFinalVisualNovelTest } from "./episode-final.contract";

/** 누락된 답으로 통과하지 않습니다. 기준은 대본이 정하고 결과는 현재 시도의 것입니다. */
export function passesEpisodeFinalStory(
  test: EpisodeFinalVisualNovelTest,
  results: readonly AnswerResult[],
): boolean {
  return (
    results.length === test.questions.length &&
    results.filter((result) => result === "correct").length >=
      (test.story?.minimumCorrect ?? test.questions.length)
  );
}
