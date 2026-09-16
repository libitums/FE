import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { FogStoryArgs } from "./fog-story";

const meta = {
  title: "Components/Fog",
  render: (args, context) =>
    createLynxView<FogStoryArgs>({
      args,
      bundleUrl: "./lynx/fog.web.bundle",
      canvasElement: context.canvasElement,
      height: "520px",
      width: "390px",
    }),
  argTypes: {
    direction: { control: "inline-radio", options: ["top", "bottom", "start", "end"] },
    size: { control: "inline-radio", options: ["s", "m", "full"] },
    color: {
      control: "select",
      options: ["white", "surface-default", "surface-basement", "surface-floating", "dark"],
    },
    visibility: { control: "inline-radio", options: ["hidden", "visible"] },
    layoutDirection: { control: "inline-radio", options: ["ltr", "rtl"] },
  },
  args: {
    direction: "bottom",
    size: "m",
    color: "surface-default",
    visibility: "visible",
    layoutDirection: "ltr",
  },
} satisfies Meta<FogStoryArgs>;

export default meta;
type Story = StoryObj<FogStoryArgs>;

export const Bottom: Story = {};
export const Top: Story = { args: { direction: "top" } };
export const HorizontalRtl: Story = {
  args: { direction: "start", size: "s", layoutDirection: "rtl" },
};
export const Hidden: Story = { args: { visibility: "hidden" } };
export const Full: Story = { args: { size: "full" } };
