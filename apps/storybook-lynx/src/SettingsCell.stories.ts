import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { SettingsCellStoryArgs } from "./settings-cell-story";

const meta = {
  title: "Components/Settings Cell",
  render: (args, context) =>
    createLynxView<SettingsCellStoryArgs>({
      args,
      bundleUrl: "./lynx/settings-cell.web.bundle",
      canvasElement: context.canvasElement,
      height: "520px",
      width: "390px",
    }),
  argTypes: {
    variant: { control: "inline-radio", options: ["navigation", "toggle", "group"] },
    leading: { control: "inline-radio", options: ["none", "avatar"] },
    title: { control: "text" },
    description: { control: "text" },
    value: { control: "text" },
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
    focused: { control: "boolean" },
    motion: { control: "inline-radio", options: ["standard", "reduced"] },
  },
  args: {
    variant: "navigation",
    leading: "none",
    title: "알림 설정",
    description: "푸시 알림을 관리합니다",
    value: "전체",
    checked: false,
    disabled: false,
    focused: false,
    motion: "standard",
  },
} satisfies Meta<SettingsCellStoryArgs>;

export default meta;
type Story = StoryObj<SettingsCellStoryArgs>;

export const Navigation: Story = {};
export const Toggle: Story = {
  args: {
    variant: "toggle",
    title: "자동 재생",
    description: "다음 학습을 자동으로 시작합니다",
    checked: true,
  },
};
export const WithAvatar: Story = {
  args: {
    leading: "avatar",
    title: "프로필",
    description: "계정 정보를 확인합니다",
    value: "김말랑",
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const Group: Story = { args: { variant: "group" } };
export const ReducedMotion: Story = { args: { variant: "toggle", motion: "reduced" } };
