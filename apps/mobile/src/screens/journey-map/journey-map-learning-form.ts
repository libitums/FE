// 스텝→학습형 배정표를 소유합니다 — `learningFormsByStep`과 조회 함수
// `learningFormsForStep`입니다. 실제 배정이 오기 전까지는 문항이 있는 표를 그대로
// 전사한 임시 값입니다.

import type { LearningForm } from "../../lib/learning-form";
import type { JourneyStepId } from "./journey-map-units";

// 튜토리얼은 표현 하나를 보고 따라 구성하는 활동 하나로 시작합니다.
// 듣기·말하기·쓰기 등의 기존 문항은 다음 커리큘럼을 위해 유지하지만 여기서 배정하지 않습니다.
const learningFormsByStep: Record<JourneyStepId, readonly [LearningForm, ...LearningForm[]]> = {
  greeting: ["sentence-order"],
  introduction: ["sentence-order"],
  ordering: ["sentence-order"],
  appointment: ["sentence-order"],
  directions: ["sentence-order"],
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
