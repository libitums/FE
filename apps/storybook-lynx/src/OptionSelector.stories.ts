import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { OptionSelectorStoryArgs } from "./story-types";

const meta = {
  title: "Components/Option Selector",
  render: (args, context) =>
    createLynxView<OptionSelectorStoryArgs>({
      args,
      bundleUrl: "./lynx/option-selector.web.bundle",
      canvasElement: context.canvasElement,
      height: "560px",
      width: "390px",
    }),
  argTypes: {
    variant: { control: "inline-radio", options: ["outlined", "filled"] },
    size: { control: "inline-radio", options: ["s", "m", "l"] },
    selection: { control: "inline-radio", options: ["single", "multiple"] },
    commit: { control: "inline-radio", options: ["deferred", "immediate"] },
    layout: { control: "inline-radio", options: ["stack", "grid"] },
    contentLanguage: { control: "inline-radio", options: ["ui", "learning"] },
    longLabels: { control: "boolean" },
    disabledLast: { control: "boolean" },
    committed: { control: "boolean" },
    onChange: { control: false },
    onCommit: { control: false },
  },
  args: {
    variant: "outlined",
    size: "m",
    selection: "single",
    commit: "deferred",
    layout: "stack",
    contentLanguage: "learning",
    longLabels: false,
    disabledLast: false,
    committed: false,
    onChange: fn(),
    onCommit: fn(),
  },
} satisfies Meta<OptionSelectorStoryArgs>;

export default meta;
type Story = StoryObj<OptionSelectorStoryArgs>;

export const Default: Story = {};
export const Filled: Story = { args: { variant: "filled" } };
export const Multiple: Story = { args: { selection: "multiple" } };
export const Immediate: Story = { args: { commit: "immediate", size: "l", longLabels: true } };
export const Grid: Story = { args: { layout: "grid", size: "s" } };
export const Disabled: Story = { args: { disabledLast: true } };
export const LongLabel: Story = { args: { longLabels: true } };
