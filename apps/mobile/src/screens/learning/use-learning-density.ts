import type { LearningDensity } from "../../lib/learning-density";

/**
 * 이 기기의 쓸 수 있는 높이로 정한 밀도입니다. 껍데기만 있는 단계라 늘 `regular`를 돌려줍니다 —
 * 창 높이와 안전 영역을 읽는 일은 아직 하지 않습니다.
 */
export function useLearningDensity(): LearningDensity {
  return "regular";
}
