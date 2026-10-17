import type { Motion } from "@libitums/ui-lynx/motion";
import type { SpecialUnitStatus } from "@libitums/ui-lynx/special-unit";
import { normalizeStoryMotion } from "./story-motion";

export type SpecialUnitStoryArgs = {
  readonly accessibilityLabel: string;
  readonly status: SpecialUnitStatus;
  readonly focused: boolean;
  readonly showAllStates: boolean;
  readonly motion: Motion;
  readonly onTap: (accessibilityLabel: string) => void;
};

export type SpecialUnitStoryData = Omit<SpecialUnitStoryArgs, "onTap">;

const statuses = new Set<SpecialUnitStatus>([
  "default",
  "checking",
  "available",
  "active",
  "clear",
]);

export function normalizeSpecialUnitStoryArgs(input: unknown): SpecialUnitStoryData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const label = typeof args.accessibilityLabel === "string" ? args.accessibilityLabel.trim() : "";

  return {
    accessibilityLabel: label || "special, A Call from Minseo",
    status: statuses.has(args.status as SpecialUnitStatus)
      ? (args.status as SpecialUnitStatus)
      : "available",
    focused: args.focused === true,
    showAllStates: args.showAllStates === true,
    motion: normalizeStoryMotion(args.motion),
  };
}

export function dispatchSpecialUnitStoryTap(
  data: SpecialUnitStoryData,
  emit: (payload: Record<string, unknown>) => void,
): boolean {
  if (data.status === "default" || data.status === "checking") return false;
  emit({
    channel: "STORYBOOK_ACTION",
    name: "onTap",
    args: [data.accessibilityLabel],
  });
  return true;
}
