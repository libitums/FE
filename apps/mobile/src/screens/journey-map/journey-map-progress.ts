// 스텝 진행의 파생값과 접근성 라벨을 소유합니다 — `stepStatusAt`·`stepAccessibilityLabel`·
// `findStep`·`journeyStepOrdinal`·`completeStep`입니다. 진행의 진실의 출처(완료
// 스텝 수)는 App의 상태이고, 이 파일은 그 값에서 파생만 합니다.

import { journeySteps } from "./journey-map-units";
import type { JourneyStep, JourneyStepId, JourneyStepStatus } from "./journey-map-units";

// 판정 규칙입니다(그대로):
//   index < completedCount   → "done"
//   index === completedCount → "current"
//   그 밖                     → "locked"
// 방어 분기를 두지 않습니다 — `navigation.ts`의 `currentScreen`과 같은 판단으로, 범위
// 밖 입력에도 위 세 줄이 그대로 적용됩니다.
export function stepStatusAt(index: number, completedCount: number): JourneyStepStatus {
  if (index < completedCount) {
    return "done";
  }
  if (index === completedCount) {
    return "current";
  }
  return "locked";
}

// export하지 않는 모듈 내부 상수입니다 — 구분자는 쉼표 + 공백입니다(ADR-0016 D3이
// 고른 것과 같은 부호).
const stepStatusSuffix: Record<JourneyStepStatus, string> = {
  done: "완료됨",
  current: "현재 스텝",
  locked: "잠김",
};

export function stepAccessibilityLabel(title: string, status: JourneyStepStatus): string {
  return `${title}, ${stepStatusSuffix[status]}`;
}

export function findStep(
  steps: readonly JourneyStep[],
  id: JourneyStepId,
): JourneyStep | undefined {
  return steps.find((step) => step.id === id);
}

// 스텝의 1-based 자리입니다. `journeySteps`의 순서에서 **파생**합니다 — 서수를 따로
// 표에 적으면 `journeySteps`와 그 표가 어긋날 자리가 생깁니다(ADR-0007 D3과 같은
// 논리). 던지지 않습니다: union이 닫혀 있고 `journeySteps`가 다섯을 전부 갖습니다.
export function journeyStepOrdinal(id: JourneyStepId): number {
  return journeySteps.findIndex((step) => step.id === id) + 1;
}

// 단조성이 계약입니다 — 모든 입력에 대해 `completeStep(c, id) >= c`입니다. 조건
// 분기(`if (ordinal > c) …`)로 쓰면 같은 값이 나오지만 단조성이 *분기의 결과*가 되어
// 다음 사람이 분기를 고칠 때 조용히 깨집니다. `Math.max`가 그 성질을 구조적으로
// 보장합니다.
export function completeStep(completedCount: number, id: JourneyStepId): number {
  return Math.max(completedCount, journeyStepOrdinal(id));
}
