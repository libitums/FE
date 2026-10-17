import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { SpecialUnitStoryArgs } from "./special-unit-story";

const meta = {
  title: "Components/Special Unit",
  render: (args, context) =>
    createLynxView<SpecialUnitStoryArgs>({
      args,
      bundleUrl: "./lynx/special-unit.web.bundle",
      canvasElement: context.canvasElement,
      height: "480px",
      width: "390px",
    }),
  argTypes: {
    accessibilityLabel: { control: "text" },
    status: {
      control: "inline-radio",
      options: ["default", "checking", "available", "active", "clear"],
    },
    focused: { control: "boolean" },
    showAllStates: { control: "boolean" },
    motion: { control: "inline-radio", options: ["standard", "reduced"] },
    onTap: { control: false },
  },
  args: {
    accessibilityLabel: "special, A Call from Minseo",
    status: "available",
    focused: false,
    showAllStates: false,
    motion: "standard",
    onTap: fn(),
  },
} satisfies Meta<SpecialUnitStoryArgs>;

export default meta;
type Story = StoryObj<SpecialUnitStoryArgs>;

export const Default: Story = { args: { status: "default" } };
export const Checking: Story = { args: { status: "checking" } };
export const Available: Story = {};
export const Active: Story = { args: { status: "active" } };
export const Clear: Story = { args: { status: "clear" } };
export const Focused: Story = { args: { focused: true } };
export const AllStates: Story = { args: { showAllStates: true } };
export const ReducedMotion: Story = { args: { motion: "reduced" } };
