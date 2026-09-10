import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { StatusIndicatorStoryArgs } from "./story-types";

const meta = {
  title: "Components/Status Indicator",
  render: (args, context) =>
    createLynxView<StatusIndicatorStoryArgs>({
      args,
      bundleUrl: "./lynx/status-indicator.web.bundle",
      canvasElement: context.canvasElement,
      height: "320px",
      width: "390px",
    }),
  argTypes: {
    status: {
      control: "inline-radio",
      options: ["completed", "in-progress", "needs-retry", "locked"],
    },
    label: { control: "text" },
    contextLabel: { control: "text" },
  },
  args: {
    status: "completed",
    label: "완료",
    contextLabel: "1단계",
  },
} satisfies Meta<StatusIndicatorStoryArgs>;

export default meta;
type Story = StoryObj<StatusIndicatorStoryArgs>;

export const Completed: Story = {};
export const InProgress: Story = {
  args: { status: "in-progress", label: "진행 중", contextLabel: "2단계" },
};
export const NeedsRetry: Story = {
  args: { status: "needs-retry", label: "다시 시도", contextLabel: "3단계" },
};
export const Locked: Story = {
  args: { status: "locked", label: "잠김", contextLabel: "4단계" },
};
