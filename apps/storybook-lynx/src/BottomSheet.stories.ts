import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { BottomSheetStoryArgs } from "./story-types";

const meta = {
  title: "Components/Bottom Sheet",
  render: (args, context) =>
    createLynxView<BottomSheetStoryArgs>({
      args,
      bundleUrl: "./lynx/bottom-sheet.web.bundle",
      canvasElement: context.canvasElement,
      height: "520px",
      width: "390px",
    }),
  argTypes: {
    title: { control: "text" },
    overline: { control: "text" },
    description: { control: "text" },
    primaryActionLabel: { control: "text" },
    secondaryActionLabel: { control: "text" },
    showSecondaryAction: { control: "boolean" },
    draggable: { control: "boolean" },
    motion: { control: "inline-radio", options: ["standard", "reduced"] },
    onDismiss: { control: false },
    onAction: { control: false },
  },
  args: {
    title: "잠깐 쉬어 갈까요?",
    overline: "학습 도구",
    description: "오디오를 다시 듣고 이어서 학습할 수 있어요",
    primaryActionLabel: "오디오 다시 듣기",
    secondaryActionLabel: "문장 다시 보기",
    showSecondaryAction: false,
    draggable: true,
    motion: "standard",
    onDismiss: fn(),
    onAction: fn(),
  },
} satisfies Meta<BottomSheetStoryArgs>;

export default meta;
type Story = StoryObj<BottomSheetStoryArgs>;
export const Default: Story = {};
export const WithoutOverline: Story = { args: { overline: "" } };
export const MultipleActions: Story = { args: { showSecondaryAction: true } };
export const WithoutDrag: Story = { args: { draggable: false } };
export const ReducedMotion: Story = { args: { motion: "reduced" } };
