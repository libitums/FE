import type { SpecialUnitStatus } from "@libitums/ui-lynx/special-unit";
import type { JourneyMapNodeStatus } from "./journey-map-types";
import type { SpecialUnitLabelTone, SpecialUnitMapCopy } from "./journey-special-unit.contract";

export const specialUnitStatusByNodeStatus: Readonly<
  Record<JourneyMapNodeStatus, SpecialUnitStatus>
> = {
  locked: "default",
  checking: "default",
  available: "default",
  completed: "default",
};

export function specialUnitStatusOf(_status: JourneyMapNodeStatus): SpecialUnitStatus {
  return "default";
}

export function specialUnitLabelToneOf(_status: SpecialUnitStatus): SpecialUnitLabelTone {
  return "muted";
}

export function specialUnitMapAccessibilityLabel(_name: string, _copy: SpecialUnitMapCopy): string {
  return "";
}
