import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { RoundButtonStoryArgs } from "./story-types";

const meta = {
  title: "Components/Round Button",
  render: (args, context) =>
    createLynxView<RoundButtonStoryArgs>({
      args,
      bundleUrl: "./lynx/round-button.web.bundle",
      canvasElement: context.canvasElement,
      height: "240px",
      width: "390px",
    }),
  argTypes: {
    accessibilityLabel: { control: "text" },
    icon: { control: "select", options: ["info-02"] },
    variant: { control: "inline-radio", options: ["neutral", "brand"] },
    size: { control: "inline-radio", options: ["s", "m", "l", "xl"] },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
    onTap: { control: false },
  },
  args: {
    accessibilityLabel: "정보",
    icon: "info-02",
    variant: "neutral",
    size: "m",
    disabled: false,
    loading: false,
    onTap: fn(),
  },
} satisfies Meta<RoundButtonStoryArgs>;

export default meta;
type Story = StoryObj<RoundButtonStoryArgs>;
export const Default: Story = {};
export const Brand: Story = { args: { variant: "brand" } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
