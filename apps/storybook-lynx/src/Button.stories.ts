import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { ButtonStoryArgs } from "./story-types";

const meta = {
  title: "Components/Button",
  render: (args, context) =>
    createLynxView<ButtonStoryArgs>({
      args,
      bundleUrl: "./lynx/button.web.bundle",
      canvasElement: context.canvasElement,
      height: "360px",
      width: "390px",
    }),
  argTypes: {
    label: { control: "text" },
    variant: {
      control: "select",
      options: ["neutral", "brand", "outline", "subtle", "text"],
    },
    size: { control: "inline-radio", options: ["s", "m", "l", "xl"] },
    width: { control: "inline-radio", options: ["hug", "fill"] },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
    onTap: { control: false },
  },
  args: {
    label: "계속하기",
    variant: "neutral",
    size: "m",
    width: "hug",
    disabled: false,
    loading: false,
    onTap: fn(),
  },
} satisfies Meta<ButtonStoryArgs>;

export default meta;
type Story = StoryObj<ButtonStoryArgs>;

export const Default: Story = {};
export const Brand: Story = { args: { variant: "brand" } };
export const Loading: Story = { args: { label: "처리 중", loading: true } };
export const Disabled: Story = { args: { label: "사용할 수 없음", disabled: true } };
