// 에피소드 띠 설명 줄의 unit 번호를 고르는 순수 함수입니다. 띠는 스텝 말풍선이 열린 동안만 서므로
// 번호는 열린 스텝이 든 구획의 그 스텝 자리(0부터 — 표지 00)입니다.

import type { JourneyMapSection, JourneyStepId } from "./journey-map-types";

export type OpenedUnit = {
  readonly section: JourneyMapSection;
  readonly unit: number;
};

export function openedUnitOf(
  sections: readonly JourneyMapSection[],
  openStepId: JourneyStepId | null,
): OpenedUnit | undefined {
  if (openStepId === null) return undefined;
  for (const section of sections) {
    const unit = section.items.findIndex(
      (item) => item.kind === "standard" && item.step.id === openStepId,
    );
    if (unit >= 0) return { section, unit };
  }
  return undefined;
}
