import { assessmentPassCriterion } from "../screens/assessment/assessment";
import { learningFormsForStep } from "../screens/journey-map/journey-map";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import { questionsForStep } from "../screens/listening/listening";
import { sentenceOrderQuestionsForStep } from "../screens/sentence-order/sentence-order";
import { wordChoiceQuestionsForStep } from "../screens/word-choice/word-choice";
import { speakingQuestionsForStep } from "../screens/speaking/speaking";
import { writingQuestionsForStep } from "../screens/writing/writing";
import { cultureQuizQuestionsForStep } from "../screens/culture-quiz/culture-quiz";

const questionProviders = {
  listening: questionsForStep,
  "sentence-order": sentenceOrderQuestionsForStep,
  "word-choice": wordChoiceQuestionsForStep,
  speaking: speakingQuestionsForStep,
  writing: writingQuestionsForStep,
  culture: cultureQuizQuestionsForStep,
};

// 제출 결과 수로 문턱을 낮추지 않습니다. 인식 불가 등으로 결과가 빠져도 배정 문항 수는 같습니다.
// 빈 활동은 최소 1 정답을 요구하므로 자동 통과하지 않습니다.
export function learningPassCriterionForStep(id: JourneyStepId) {
  const count = learningFormsForStep(id).reduce(
    (sum, form) => sum + questionProviders[form](id).length,
    0,
  );
  return { minCorrectCount: Math.max(1, Math.min(assessmentPassCriterion.minCorrectCount, count)) };
}
