import { fn } from "storybook/test";
import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { OverlayStoryArgs } from "./overlay-story";

const meta = {
  title: "Components/Overlay",
  render: (args, context) =>
    createLynxView<OverlayStoryArgs>({
      args,
      bundleUrl: "./lynx/overlay.web.bundle",
      canvasElement: context.canvasElement,
      height: "640px",
      width: "390px",
    }),
  argTypes: {
    scope: { control: "inline-radio", options: ["screen", "area"] },
    surface: { control: "inline-radio", options: ["sheet", "dialog"] },
    blur: { control: "inline-radio", options: ["off", "on"] },
    dismiss: { control: "inline-radio", options: ["none", "tap"] },
    phase: { control: "inline-radio", options: ["entering", "visible", "exiting"] },
    motion: { control: "inline-radio", options: ["standard", "reduced"] },
    onDismiss: { control: false },
  },
  args: {
    scope: "screen",
    surface: "sheet",
    blur: "off",
    dismiss: "tap",
    phase: "visible",
    motion: "standard",
    onDismiss: fn(),
  },
} satisfies Meta<OverlayStoryArgs>;

export default meta;
type Story = StoryObj<OverlayStoryArgs>;

export const SheetDismissible: Story = {};
export const DialogModal: Story = { args: { surface: "dialog", dismiss: "none" } };
export const Area: Story = { args: { scope: "area", dismiss: "none" } };
export const AreaBlur: Story = { args: { scope: "area", blur: "on", dismiss: "none" } };
export const ReducedMotion: Story = { args: { motion: "reduced", phase: "entering" } };
