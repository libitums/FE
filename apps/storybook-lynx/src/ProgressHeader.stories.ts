import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { ProgressHeaderStoryArgs } from "./story-types";

const meta = {
  title: "Components/Progress Header",
  render: (args, context) =>
    createLynxView<ProgressHeaderStoryArgs>({
      args,
      bundleUrl: "./lynx/progress-header.web.bundle",
      canvasElement: context.canvasElement,
      height: "180px",
      width: "390px",
    }),
  argTypes: {
    title: { control: "text" },
    activity: { control: "text" },
    progress: { control: { type: "number", min: -20, max: 120, step: 0.1 } },
    exitAccessibilityLabel: { control: "text" },
    motion: { control: "inline-radio", options: ["standard", "reduced"] },
    onExit: { control: false },
  },
  args: {
    title: "오늘의 학습",
    activity: "1단계",
    progress: 42,
    exitAccessibilityLabel: "학습 나가기",
    motion: "standard",
    onExit: fn(),
  },
} satisfies Meta<ProgressHeaderStoryArgs>;

export default meta;
type Story = StoryObj<ProgressHeaderStoryArgs>;

export const Default: Story = {};
export const Zero: Story = { args: { progress: 0 } };
export const MinimumFill: Story = { args: { progress: 0.1 } };
export const Complete: Story = { args: { progress: 100 } };
export const ReducedMotion: Story = { args: { motion: "reduced" } };
