import type { LearningForm } from "../../lib/learning-form";
import type { JourneyStepId } from "../../screens/journey-map/journey-map";

// 범용 학습 엔진의 듣기·말하기·쓰기·다중 활동 회귀용 배정입니다.
// 제품 튜토리얼의 실물 경로는 App.tutorial-units.integration.test.tsx가 대역 없이 검증합니다.
const forms: Record<JourneyStepId, readonly [LearningForm, ...LearningForm[]]> = {
  greeting: ["sentence-order"],
  introduction: ["listening", "word-choice", "speaking"],
  ordering: ["listening"],
  appointment: ["listening"],
  directions: ["listening", "writing"],
  "tutorial-listening": ["listening"],
  "tutorial-speaking": ["speaking"],
  "tutorial-writing": ["writing"],
};
export const learningFormsForStep = (id: JourneyStepId) => forms[id];
export const learningFormAt = (id: JourneyStepId, index: number) => forms[id][index];
