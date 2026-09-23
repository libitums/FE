import type { LearningUnitNarrative, LearningUnitStatus } from "@libitums/ui-lynx/learning-unit";

export type LearningUnitStoryIcon = "headset" | "audio-waves";

export type LearningUnitStoryArgs = {
  readonly accessibilityLabel: string;
  readonly status: LearningUnitStatus;
  readonly narrative: LearningUnitNarrative;
  readonly icon: LearningUnitStoryIcon;
  readonly focused: boolean;
  readonly showAllStates: boolean;
  readonly onTap: (accessibilityLabel: string) => void;
};

export type LearningUnitStoryData = Omit<LearningUnitStoryArgs, "onTap">;

const statuses = new Set<LearningUnitStatus>(["default", "available", "active", "clear"]);
const narratives = new Set<LearningUnitNarrative>(["none", "narrative"]);
const icons = new Set<LearningUnitStoryIcon>(["headset", "audio-waves"]);

export function normalizeLearningUnitStoryArgs(input: unknown): LearningUnitStoryData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const label = typeof args.accessibilityLabel === "string" ? args.accessibilityLabel.trim() : "";

  return {
    accessibilityLabel: label || "1단원 쇼핑 표현 듣기",
    status: statuses.has(args.status as LearningUnitStatus)
      ? (args.status as LearningUnitStatus)
      : "available",
    narrative: narratives.has(args.narrative as LearningUnitNarrative)
      ? (args.narrative as LearningUnitNarrative)
      : "none",
    icon: icons.has(args.icon as LearningUnitStoryIcon)
      ? (args.icon as LearningUnitStoryIcon)
      : "headset",
    focused: args.focused === true,
    showAllStates: args.showAllStates === true,
  };
}

export function dispatchLearningUnitStoryTap(
  data: LearningUnitStoryData,
  emit: (payload: Record<string, unknown>) => void,
): boolean {
  if (data.status === "default") return false;
  emit({
    channel: "STORYBOOK_ACTION",
    name: "onTap",
    args: [data.accessibilityLabel],
  });
  return true;
}
