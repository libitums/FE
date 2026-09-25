import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { LearningUnitStoryArgs } from "./learning-unit-story";

const meta = {
  title: "Components/Learning Unit",
  render: (args, context) =>
    createLynxView<LearningUnitStoryArgs>({
      args,
      bundleUrl: "./lynx/learning-unit.web.bundle",
      canvasElement: context.canvasElement,
      height: "480px",
      width: "390px",
    }),
  argTypes: {
    accessibilityLabel: { control: "text" },
    status: {
      control: "inline-radio",
      options: ["default", "available", "active", "clear"],
    },
    narrative: { control: "inline-radio", options: ["none", "narrative"] },
    icon: { control: "inline-radio", options: ["headset", "audio-waves"] },
    focused: { control: "boolean" },
    showAllStates: { control: "boolean" },
    onTap: { control: false },
  },
  args: {
    accessibilityLabel: "1단원 쇼핑 표현 듣기",
    status: "available",
    narrative: "none",
    icon: "headset",
    focused: false,
    showAllStates: false,
    onTap: fn(),
  },
} satisfies Meta<LearningUnitStoryArgs>;

export default meta;
type Story = StoryObj<LearningUnitStoryArgs>;

export const Available: Story = {};
export const Default: Story = { args: { status: "default" } };
export const Active: Story = { args: { status: "active" } };
export const Clear: Story = { args: { status: "clear" } };
export const Narrative: Story = { args: { narrative: "narrative" } };
export const Focused: Story = { args: { focused: true } };
export const AllStates: Story = { args: { showAllStates: true } };
