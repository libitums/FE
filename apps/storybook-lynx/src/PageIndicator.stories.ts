import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";
import type { PageIndicatorStoryArgs } from "./story-types";

const meta = {
  title: "Components/Page Indicator",
  render: (args, context) =>
    createLynxView<PageIndicatorStoryArgs>({
      args,
      bundleUrl: "./lynx/page-indicator.web.bundle",
      canvasElement: context.canvasElement,
      height: "240px",
      width: "390px",
    }),
  argTypes: {
    pageCount: { control: { type: "number", min: 0, max: 100, step: 1 } },
    currentPage: { control: { type: "number", min: 1, max: 100, step: 1 } },
  },
  args: { pageCount: 4, currentPage: 2 },
} satisfies Meta<PageIndicatorStoryArgs>;

export default meta;
type Story = StoryObj<PageIndicatorStoryArgs>;

export const Default: Story = {};
export const First: Story = { args: { pageCount: 4, currentPage: 1 } };
export const Last: Story = { args: { pageCount: 4, currentPage: 4 } };
export const Single: Story = { args: { pageCount: 1, currentPage: 1 } };
export const Empty: Story = { args: { pageCount: 0, currentPage: 0 } };
