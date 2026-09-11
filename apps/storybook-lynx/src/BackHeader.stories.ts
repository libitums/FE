import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { BackHeaderStoryArgs } from "./story-types";

const meta = {
  title: "Components/Back Header",
  render: (args, context) =>
    createLynxView<BackHeaderStoryArgs>({
      args,
      bundleUrl: "./lynx/back-header.web.bundle",
      canvasElement: context.canvasElement,
      height: "320px",
      width: "390px",
    }),
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
    showInfo: { control: "boolean" },
    onBack: { control: false },
    onInfo: { control: false },
  },
  args: {
    title: "단계 선택",
    subtitle: "나에게 맞는 단계를 골라보세요",
    showInfo: true,
    onBack: fn(),
    onInfo: fn(),
  },
} satisfies Meta<BackHeaderStoryArgs>;

export default meta;
type Story = StoryObj<BackHeaderStoryArgs>;

export const Default: Story = {};
export const TitleOnly: Story = { args: { subtitle: "", showInfo: false } };
