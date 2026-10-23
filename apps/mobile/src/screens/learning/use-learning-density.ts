import { useGlobalProps } from "@lynx-js/react";

import { learningDensityOf, screenHeightFrom } from "../../lib/learning-density";
import type { LearningDensity } from "../../lib/learning-density";
import { safeAreaInsetsFrom } from "../../lib/safe-area";

/**
 * 이 기기의 쓸 수 있는 높이(창 높이 − 안전 영역 위 − 아래)로 정한 밀도입니다. 셸과 화면이 같은 전역 값에서 읽으므로
 * 둘이 늘 같은 답을 냅니다. `SystemInfo`가 없는 런타임은 높이를 모르는 것이라 compact로 갑니다.
 */
export function useLearningDensity(): LearningDensity {
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const info = typeof SystemInfo === "undefined" ? undefined : SystemInfo;
  return learningDensityOf(screenHeightFrom(info), insets);
}
