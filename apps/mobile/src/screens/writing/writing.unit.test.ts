import { expect, test } from "vitest";

import {
  finishWritingQuestion,
  initialWritingScreenState,
  writingQuestionsForStep,
} from "./writing";
import type { JourneyStepId } from "../journey-map/journey-map";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

// WR1 — 잰 음절이 없던 문항(`null`)은 싣지 않고 다음 문항으로만 갑니다.
test("[WR1] 문항을 끝내면 다음 문항으로 가고, 결과가 없으면 싣지 않는다", () => {
  const first = finishWritingQuestion(initialWritingScreenState, "incorrect");
  expect(first).toEqual({ questionIndex: 1, results: ["incorrect"] });
  expect(finishWritingQuestion(first, null)).toEqual({ questionIndex: 2, results: ["incorrect"] });
});

// WR2 — 문항 표의 **모양**만 봅니다(값은 임시입니다). 칸 하나가 한 음절이어야 견주기 지표가
// 뜻을 가집니다.
test("[WR2] 모든 스텝의 문항은 칸마다 한 음절이고 문항 id가 겹치지 않는다", () => {
  const ids = allStepIds.flatMap((id) =>
    writingQuestionsForStep(id).map((question) => question.id),
  );
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of allStepIds) {
    for (const question of writingQuestionsForStep(id)) {
      for (const syllable of question.syllables) {
        expect([...syllable]).toHaveLength(1);
      }
    }
  }
});
