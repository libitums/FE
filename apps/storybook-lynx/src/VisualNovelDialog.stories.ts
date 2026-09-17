import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { VisualNovelDialogStoryArgs } from "./story-types";

const meta = {
  title: "Components/Visual Novel Dialog",
  render: (args, context) =>
    createLynxView<VisualNovelDialogStoryArgs>({
      args,
      bundleUrl: "./lynx/visual-novel-dialog.web.bundle",
      canvasElement: context.canvasElement,
      height: "520px",
      width: "390px",
    }),
  argTypes: {
    accessibilityLabel: { control: "text" },
    variant: { control: "inline-radio", options: ["speech", "narration", "thought"] },
    surface: { control: "inline-radio", options: ["opaque", "translucent"] },
    reveal: { control: "inline-radio", options: ["instant", "typewriter"] },
    status: { control: "inline-radio", options: ["revealing", "ready"] },
    advance: { control: "inline-radio", options: ["tap", "auto"] },
    continueIndicator: { control: "inline-radio", options: ["on", "off"] },
    contentLanguage: { control: "inline-radio", options: ["ui", "learning"] },
    direction: { control: "inline-radio", options: ["ltr", "rtl"] },
    line: { control: "text" },
    speakerName: { control: "text" },
    languageTag: { control: "text" },
    visibleCharacterCount: { control: { type: "number", min: 0, max: 200 } },
    showAvatar: { control: "boolean" },
    reducedMotion: { control: "boolean" },
  },
  args: {
    accessibilityLabel: "",
    variant: "speech",
    surface: "opaque",
    reveal: "instant",
    status: "ready",
    advance: "tap",
    continueIndicator: "on",
    contentLanguage: "ui",
    direction: "ltr",
    line: "달빛이 비치는 숲길에서 드디어 다시 만났네.",
    speakerName: "아리아",
    languageTag: "",
    visibleCharacterCount: 12,
    showAvatar: true,
    reducedMotion: false,
  },
} satisfies Meta<VisualNovelDialogStoryArgs>;

export default meta;
type Story = StoryObj<VisualNovelDialogStoryArgs>;

export const Speech: Story = {};
export const Narration: Story = {
  args: { variant: "narration", showAvatar: false, line: "숲에는 밤바람만 조용히 머물렀다." },
};
export const Thought: Story = {
  args: { variant: "thought", line: "지금이라면 내 진심을 말할 수 있을까?" },
};
export const Translucent: Story = { args: { surface: "translucent" } };
export const Revealing: Story = {
  args: { reveal: "typewriter", status: "revealing", visibleCharacterCount: 12 },
};
export const AutoAdvance: Story = { args: { advance: "auto" } };
export const LearningLanguage: Story = {
  args: {
    contentLanguage: "learning",
    languageTag: "en-US",
    line: "I knew we would meet again under the moonlight.",
    speakerName: "Aria",
  },
};
export const RightToLeft: Story = {
  args: {
    contentLanguage: "learning",
    direction: "rtl",
    languageTag: "ar-SA",
    line: "كنت أعرف أننا سنلتقي مرة أخرى تحت ضوء القمر.",
    speakerName: "آريا",
  },
};
export const LongContent: Story = {
  args: {
    line: "번역된 대사가 여러 줄로 길어져도 패널은 내용을 자르지 않고 읽기 흐름과 하단 여백을 안정적으로 유지합니다.",
  },
};
