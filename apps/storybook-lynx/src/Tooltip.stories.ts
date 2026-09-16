import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { TooltipStoryArgs } from "./story-types";

const meta = {
  title: "Components/Tooltip",
  render: (args, context) =>
    createLynxView<TooltipStoryArgs>({
      args,
      bundleUrl: "./lynx/tooltip.web.bundle",
      canvasElement: context.canvasElement,
      height: "320px",
      width: "390px",
    }),
  argTypes: {
    message: { control: "text" },
    placement: { control: "inline-radio", options: ["top", "bottom", "start", "end"] },
    alignment: { control: "inline-radio", options: ["start", "center", "end"] },
    arrow: { control: "inline-radio", options: ["on", "off"] },
    tone: { control: "inline-radio", options: ["brand", "neutral"] },
    visibility: { control: "inline-radio", options: ["visible", "hidden"] },
    direction: { control: "inline-radio", options: ["ltr", "rtl"] },
    contentLanguage: { control: "inline-radio", options: ["ui", "learning"] },
    languageTag: { control: "text" },
  },
  args: {
    message: "힌트를 확인해 보세요",
    placement: "top",
    alignment: "center",
    arrow: "on",
    tone: "neutral",
    visibility: "visible",
    direction: "ltr",
    contentLanguage: "ui",
    languageTag: "",
  },
} satisfies Meta<TooltipStoryArgs>;

export default meta;
type Story = StoryObj<TooltipStoryArgs>;

export const Top: Story = {};
export const Bottom: Story = { args: { placement: "bottom" } };
export const Start: Story = { args: { placement: "start" } };
export const End: Story = { args: { placement: "end" } };
export const Brand: Story = { args: { tone: "brand", message: "이번 학습의 핵심 힌트" } };
export const NoArrow: Story = { args: { arrow: "off" } };
export const AlignedStart: Story = { args: { alignment: "start" } };
export const LearningLanguage: Story = {
  args: { contentLanguage: "learning", languageTag: "en-US", message: "Try again" },
};
