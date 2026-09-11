export type StepIndicatorStepStatus = "completed" | "current" | "upcoming";

export type StepIndicatorProps = {
  readonly currentStep: number;
  readonly totalSteps: number;
};

export type StepIndicatorStep = {
  readonly number: number;
  readonly status: StepIndicatorStepStatus;
};

export type StepIndicatorContract = {
  readonly accessibilityLabel: string;
  readonly steps: readonly StepIndicatorStep[];
};
