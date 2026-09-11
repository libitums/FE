import type { StepIndicatorProps } from "@libitums/ui-lynx/step-indicator";

export type StepIndicatorStoryArgs = StepIndicatorProps;

export function normalizeStepIndicatorStoryArgs(input: unknown): StepIndicatorStoryArgs {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const totalSteps =
    Number.isInteger(args.totalSteps) &&
    Number(args.totalSteps) >= 2 &&
    Number(args.totalSteps) <= 5
      ? Number(args.totalSteps)
      : 4;
  const currentStep =
    Number.isInteger(args.currentStep) &&
    Number(args.currentStep) >= 1 &&
    Number(args.currentStep) <= totalSteps
      ? Number(args.currentStep)
      : Math.min(2, totalSteps);

  return { currentStep, totalSteps };
}
