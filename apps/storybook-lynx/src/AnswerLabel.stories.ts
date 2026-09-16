import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { AnswerLabelStoryArgs } from "./story-types";

const meta = {
  title: "Components/Answer Label",
  render: (args, context) =>
    createLynxView<AnswerLabelStoryArgs>({
      args,
      bundleUrl: "./lynx/answer-label.web.bundle",
      canvasElement: context.canvasElement,
      height: "240px",
      width: "390px",
    }),
  argTypes: {
    result: { control: "inline-radio", options: ["pending", "correct", "incorrect"] },
    emphasis: { control: "inline-radio", options: ["solid", "subtle"] },
    size: { control: "inline-radio", options: ["s", "m", "l"] },
    label: { control: "text" },
    contextLabel: { control: "text" },
  },
  args: {
    result: "pending",
    emphasis: "solid",
    size: "m",
    label: "잘 들어 보세요",
    contextLabel: "",
  },
} satisfies Meta<AnswerLabelStoryArgs>;

export default meta;
type Story = StoryObj<AnswerLabelStoryArgs>;

export const Pending: Story = {};
export const Correct: Story = { args: { result: "correct", label: "정답이에요" } };
export const Incorrect: Story = { args: { result: "incorrect", label: "오답이에요" } };
export const Subtle: Story = {
  args: { result: "correct", emphasis: "subtle", size: "s", label: "정답이에요" },
};
export const Large: Story = {
  args: { result: "incorrect", size: "l", label: "오답이에요" },
};
export const LongLabel: Story = {
  args: {
    result: "incorrect",
    emphasis: "subtle",
    label: "조금 더 생각한 뒤 문장을 다시 듣고 알맞은 답을 골라 보세요",
    contextLabel: "3번 문제",
  },
};
