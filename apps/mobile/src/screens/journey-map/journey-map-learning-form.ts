// 스텝→학습형 배정표를 소유합니다 — `learningFormsByStep`과 조회 함수
// `learningFormsForStep`입니다. 실제 배정이 오기 전까지는 문항이 있는 표를 그대로
// 전사한 임시 값입니다.

import type { LearningForm } from "../../lib/learning-form";
import type { JourneyStepId } from "./journey-map-units";

// 일반 유닛마다 활동을 실행 순서대로 배정합니다. 목록은 비어 있을 수 없고,
// 실제 문항이 있는 학습형과 일치해야 합니다(journey-map.unit.test.ts의 교차 불변식).
// 첫 인사는 한 표현에 답하는 안내 활동이고, 듣기와 다른 조작은 다음 유닛부터 다룹니다.
const learningFormsByStep: Record<JourneyStepId, readonly [LearningForm, ...LearningForm[]]> = {
  greeting: ["sentence-order"],
  // ⟨2026-09-28⟩ 이름 묻기는 듣기 → 낱말 고르기 뒤에 말하기가 이어집니다 — 말하기(Figma
  // 65-282)에 처음 닿는 자리입니다. 문항은 `speakingQuestionsByStep.introduction`의 임시 셋입니다.
  introduction: ["listening", "word-choice", "speaking"],
  ordering: ["listening"],
  appointment: ["listening"],
  // ⟨2026-09-29⟩ 길 묻기는 듣기 뒤에 쓰기가 이어집니다 — 쓰기 학습형에 처음 닿는 자리입니다.
  // 문항은 `writingQuestionsByStep.directions`의 임시 셋입니다. 다른 스텝의 흐름을 지키는
  // 테스트가 많아 가장 덜 밟힌 스텝을 골랐습니다 — 배정 근거가 아닙니다.
  directions: ["listening", "writing"],
};

// 던지지 않는 총함수입니다 — `Record`가 다섯 키를 전부 덮는 것을 tsc가 지므로 방어
// 분기도 `undefined` 반환도 없습니다. `sentenceOrderQuestionsForStep`이 쓴 것과 같은
// 문장입니다. 새 스텝이 늘면 위 `Record`가 `TS2741`로 섭니다.
export function learningFormsForStep(
  id: JourneyStepId,
): readonly [LearningForm, ...LearningForm[]] {
  return learningFormsByStep[id];
}

/**
 * 스텝의 `index`번째 활동입니다. 목록 밖이면 `undefined`이고, 그것이 「이 스텝의 활동이
 * 끝났다」는 뜻입니다 — 부르는 쪽은 그때 평가로 갑니다.
 *
 * 인덱스 판정을 이 함수가 지는 이유는 목록 길이를 밖으로 내보내지 않기 위해서입니다.
 * 길이를 내보내면 부르는 쪽마다 `index < length` 비교를 따로 적게 되고, 그 비교가
 * 어긋나는 날 활동 하나가 조용히 건너뛰어집니다.
 */
export function learningFormAt(id: JourneyStepId, index: number): LearningForm | undefined {
  return learningFormsByStep[id][index];
}
