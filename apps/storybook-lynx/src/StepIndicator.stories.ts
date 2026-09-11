import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { StepIndicatorStoryArgs } from "./step-indicator-story";

const meta = {
  title: "Components/Step Indicator",
  render: (args, context) =>
    createLynxView<StepIndicatorStoryArgs>({
      args,
      bundleUrl: "./lynx/step-indicator.web.bundle",
      canvasElement: context.canvasElement,
      height: "240px",
      width: "390px",
    }),
  argTypes: {
    currentStep: { control: { type: "number", min: 1, max: 5, step: 1 } },
    totalSteps: { control: { type: "number", min: 2, max: 5, step: 1 } },
  },
  args: {
    currentStep: 1,
    totalSteps: 4,
  },
} satisfies Meta<StepIndicatorStoryArgs>;

export default meta;
type Story = StoryObj<StepIndicatorStoryArgs>;

export const First: Story = {};
export const Middle: Story = { args: { currentStep: 2 } };
export const Last: Story = { args: { currentStep: 4 } };
