import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { DialogStoryArgs } from "./story-types";

const meta = {
  title: "Components/Dialog",
  render: (args, context) =>
    createLynxView<DialogStoryArgs>({
      args,
      bundleUrl: "./lynx/dialog.web.bundle",
      canvasElement: context.canvasElement,
      height: "480px",
      width: "390px",
    }),
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    actionCount: { control: "inline-radio", options: [1, 2] },
    disabledLast: { control: "boolean" },
    motion: { control: "inline-radio", options: ["standard", "reduced"] },
    onAction: { control: false },
  },
  args: {
    title: "학습을 그만둘까요?",
    description: "지금까지의 진행 내용이 사라져요",
    actionCount: 2,
    disabledLast: false,
    motion: "standard",
    onAction: fn(),
  },
} satisfies Meta<DialogStoryArgs>;

export default meta;
type Story = StoryObj<DialogStoryArgs>;

export const Default: Story = {};
export const SingleAction: Story = { args: { actionCount: 1, description: "" } };
export const WithoutDescription: Story = { args: { description: "" } };
export const DisabledSecondary: Story = { args: { disabledLast: true } };
export const ReducedMotion: Story = { args: { motion: "reduced" } };
