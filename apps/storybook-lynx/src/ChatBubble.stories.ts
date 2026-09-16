import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { ChatBubbleStoryArgs } from "./story-types";

const meta = {
  title: "Components/Chat Bubble",
  render: (args, context) =>
    createLynxView<ChatBubbleStoryArgs>({
      args,
      bundleUrl: "./lynx/chat-bubble.web.bundle",
      canvasElement: context.canvasElement,
      height: "300px",
      width: "390px",
    }),
  argTypes: {
    message: { control: "text" },
    speaker: { control: "text" },
    direction: { control: "inline-radio", options: ["incoming", "outgoing"] },
    size: { control: "inline-radio", options: ["s", "m", "l"] },
    delivery: {
      control: "select",
      options: ["default", "sending", "sent", "read", "failed"],
    },
    contentLanguage: { control: "inline-radio", options: ["ui", "learning"] },
    languageTag: { control: "text" },
  },
  args: {
    message: "오늘 하루는 어땠어?",
    speaker: "말랑이",
    direction: "incoming",
    size: "m",
    delivery: "default",
    contentLanguage: "ui",
    languageTag: "",
  },
} satisfies Meta<ChatBubbleStoryArgs>;

export default meta;
type Story = StoryObj<ChatBubbleStoryArgs>;

export const Incoming: Story = {};
export const Outgoing: Story = {
  args: { direction: "outgoing", speaker: "나", message: "좋았어요. 내일 또 만나요!" },
};
export const Small: Story = { args: { size: "s", message: "네, 좋아요." } };
export const Large: Story = { args: { size: "l", message: "이 표현은 꼭 기억해 주세요." } };
export const Failed: Story = {
  args: { direction: "outgoing", speaker: "나", delivery: "failed", message: "곧 도착해요." },
};
export const LearningLanguage: Story = {
  args: {
    contentLanguage: "learning",
    languageTag: "en-US",
    message: "See you tomorrow.",
    speaker: "Mina",
  },
};
export const LongContent: Story = {
  args: {
    message:
      "번역된 문장이 길어지거나 https://example.com/a-very-long-continuous-message-address 같은 문자열이 있어도 내용 전체를 보여 줍니다.",
  },
};
