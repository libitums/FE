import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { BottomNavigatorStoryArgs } from "./story-types";

const meta = {
  title: "Components/Bottom Navigator",
  render: (args, context) =>
    createLynxView<BottomNavigatorStoryArgs>({
      args,
      bundleUrl: "./lynx/bottom-navigator.web.bundle",
      canvasElement: context.canvasElement,
      height: "320px",
      width: `${args.viewportWidth}px`,
    }),
  argTypes: {
    preset: { control: "inline-radio", options: ["default", "long-label", "all-items"] },
    selectedId: {
      control: "select",
      options: ["home", "journey", "roleplay", "settings", "notifications"],
    },
    disabledLast: { control: "boolean" },
    viewportWidth: { control: "inline-radio", options: [320, 390] },
    onSelect: { control: false },
  },
  args: {
    preset: "default",
    selectedId: "home",
    disabledLast: false,
    viewportWidth: 390,
    onSelect: fn(),
  },
} satisfies Meta<BottomNavigatorStoryArgs>;

export default meta;
type Story = StoryObj<BottomNavigatorStoryArgs>;

export const Default: Story = {};
export const LongAccessibilityLabel: Story = { args: { preset: "long-label" } };
export const AllItems: Story = {
  args: { preset: "all-items", selectedId: "roleplay", viewportWidth: 320 },
};
export const Disabled: Story = { args: { preset: "all-items", disabledLast: true } };
