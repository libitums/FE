import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { AvatarStoryArgs } from "./avatar-story";

const meta = {
  title: "Components/Avatar",
  render: (args, context) =>
    createLynxView<AvatarStoryArgs>({
      args,
      bundleUrl: "./lynx/avatar.web.bundle",
      canvasElement: context.canvasElement,
      height: "420px",
      width: "390px",
    }),
  argTypes: {
    content: {
      control: "inline-radio",
      options: ["image", "initials", "placeholder", "broken-image"],
    },
    name: { control: "text" },
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg", "xl"] },
    accessibility: { control: "inline-radio", options: ["label", "hidden"] },
    showAllSizes: { control: "boolean" },
  },
  args: {
    content: "initials",
    name: "Kim Ray",
    size: "md",
    accessibility: "label",
    showAllSizes: false,
  },
} satisfies Meta<AvatarStoryArgs>;

export default meta;
type Story = StoryObj<AvatarStoryArgs>;

export const Image: Story = { args: { content: "image", name: "Kim Ray", size: "lg" } };
export const Initials: Story = {};
export const CjkInitials: Story = { args: { name: "김말랑" } };
export const Placeholder: Story = { args: { content: "placeholder", name: "" } };
export const BrokenImage: Story = {
  args: { content: "broken-image", name: "Kim Ray", size: "lg" },
};
export const AllSizes: Story = {
  args: { content: "placeholder", name: "", showAllSizes: true },
};
export const Decorative: Story = { args: { accessibility: "hidden" } };
