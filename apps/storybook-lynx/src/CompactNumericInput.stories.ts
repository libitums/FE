import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { CompactNumericInputStoryArgs } from "./story-types";

const meta = {
  title: "Components/Compact Numeric Input",
  render: (args, context) =>
    createLynxView<CompactNumericInputStoryArgs>({
      args,
      bundleUrl: "./lynx/compact-numeric-input.web.bundle",
      canvasElement: context.canvasElement,
      height: "240px",
      width: "390px",
    }),
  argTypes: {
    accessibilityLabel: { control: "text" },
    defaultValue: { control: "text" },
    placeholder: { control: "text" },
    size: { control: "inline-radio", options: ["s", "m", "l"] },
    error: { control: "boolean" },
    disabled: { control: "boolean" },
    onInput: { control: false },
  },
  args: {
    accessibilityLabel: "반복 횟수",
    defaultValue: "",
    placeholder: "0",
    size: "m",
    error: false,
    disabled: false,
    onInput: fn(),
  },
} satisfies Meta<CompactNumericInputStoryArgs>;

export default meta;
type Story = StoryObj<CompactNumericInputStoryArgs>;
export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: "7" } };
export const Small: Story = { args: { size: "s" } };
export const Large: Story = { args: { size: "l" } };
export const Error: Story = { args: { defaultValue: "4", error: true } };
export const Disabled: Story = { args: { defaultValue: "3", disabled: true } };
