import type { SpecialUnitStatus } from "@libitums/ui-lynx/special-unit";
import type { JourneyMapNodeStatus } from "./journey-map-types";
import type { SpecialUnitLabelTone, SpecialUnitMapCopy } from "./journey-special-unit.contract";

// 맵 어휘 넷을 유닛 어휘로 옮깁니다. 맵에는 진행 중(active) 표식이 없어 active는 나오지 않습니다.
export const specialUnitStatusByNodeStatus: Readonly<
  Record<JourneyMapNodeStatus, SpecialUnitStatus>
> = {
  locked: "default",
  checking: "checking",
  available: "available",
  completed: "clear",
};

export function specialUnitStatusOf(status: JourneyMapNodeStatus): SpecialUnitStatus {
  return specialUnitStatusByNodeStatus[status];
}

const toneByStatus: Readonly<Record<SpecialUnitStatus, SpecialUnitLabelTone>> = {
  default: "muted",
  checking: "muted",
  available: "brand",
  active: "brand",
  clear: "correct",
};

export function specialUnitLabelToneOf(status: SpecialUnitStatus): SpecialUnitLabelTone {
  return toneByStatus[status];
}

/** 상태 접미사는 붙이지 않습니다 — 컴포넌트가 붙입니다. */
export function specialUnitMapAccessibilityLabel(name: string, copy: SpecialUnitMapCopy): string {
  return copy.accessibilityLabel(name);
}
