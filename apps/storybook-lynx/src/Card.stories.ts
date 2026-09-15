import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { CardStoryArgs } from "./story-types";

const meta = {
  title: "Components/Card",
  render: (args, context) =>
    createLynxView<CardStoryArgs>({
      args,
      bundleUrl: "./lynx/card.web.bundle",
      canvasElement: context.canvasElement,
      height: "520px",
      width: "390px",
    }),
  argTypes: {
    padding: { control: "inline-radio", options: ["m", "l"] },
    interaction: { control: "inline-radio", options: ["static", "interactive"] },
    direction: { control: "inline-radio", options: ["ltr", "rtl"] },
    title: { control: "text" },
    overline: { control: "text" },
    body: { control: "text" },
    showMedia: { control: "boolean" },
    onTap: { control: false },
  },
  args: {
    padding: "m",
    interaction: "static",
    direction: "ltr",
    title: "오늘의 학습",
    overline: "추천",
    body: "카페에서 자연스럽게 주문하는 표현을 연습해 보세요.",
    showMedia: false,
    onTap: fn(),
  },
} satisfies Meta<CardStoryArgs>;

export default meta;
type Story = StoryObj<CardStoryArgs>;

export const Static: Story = {};
export const Interactive: Story = { args: { interaction: "interactive" } };
export const LargeWithMedia: Story = { args: { padding: "l", showMedia: true } };
export const RightToLeft: Story = { args: { interaction: "interactive", direction: "rtl" } };
