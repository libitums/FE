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

export function getStepIndicatorContract(props: StepIndicatorProps): StepIndicatorContract {
  if (!Number.isInteger(props.totalSteps) || props.totalSteps < 2 || props.totalSteps > 5) {
    throw new Error("totalSteps must be an integer between 2 and 5");
  }

  if (
    !Number.isInteger(props.currentStep) ||
    props.currentStep < 1 ||
    props.currentStep > props.totalSteps
  ) {
    throw new Error("currentStep must be an integer between 1 and totalSteps");
  }

  const steps = Array.from({ length: props.totalSteps }, (_, index) => {
    const number = index + 1;
    const status: StepIndicatorStepStatus =
      number < props.currentStep
        ? "completed"
        : number === props.currentStep
          ? "current"
          : "upcoming";

    return { number, status };
  });

  return {
    accessibilityLabel: `${props.totalSteps}단계 중 ${props.currentStep}단계`,
    steps,
  };
}
