import { createLynxView } from "storybook-lynx-rsbuild";
import type { Meta, StoryObj } from "storybook-lynx-rsbuild";

import type { TextFieldStoryArgs } from "./story-types";

const meta = {
  title: "Components/Text Field",
  render: (args, context) =>
    createLynxView<TextFieldStoryArgs>({
      args,
      bundleUrl: "./lynx/text-field.web.bundle",
      canvasElement: context.canvasElement,
      height: "360px",
      width: "390px",
    }),
  argTypes: {
    label: { control: "text" },
    qualifier: { control: "text" },
    defaultValue: { control: "text" },
    placeholder: { control: "text" },
    purpose: {
      control: "select",
      options: ["text", "email", "password", "search", "url", "telephone"],
    },
    availability: { control: "inline-radio", options: ["enabled", "read-only", "disabled"] },
    supporting: { control: "inline-radio", options: ["none", "helper", "error"] },
    supportingMessage: { control: "text" },
    counterMaxLength: { control: { type: "number", min: 0, step: 1 } },
    adornment: {
      control: "select",
      options: ["none", "icons", "prefix-suffix", "action"],
    },
  },
  args: {
    label: "이메일 주소",
    qualifier: "필수",
    defaultValue: "",
    placeholder: "예: name@example.com",
    purpose: "email",
    availability: "enabled",
    supporting: "helper",
    supportingMessage: "로그인할 때 사용할 이메일 주소를 입력해 주세요.",
    counterMaxLength: 0,
    adornment: "none",
  },
} satisfies Meta<TextFieldStoryArgs>;

export default meta;
type Story = StoryObj<TextFieldStoryArgs>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "hello@example.com" } };
export const Error: Story = {
  args: {
    defaultValue: "hello",
    supporting: "error",
    supportingMessage: "이메일 주소를 name@example.com 형식으로 입력해 주세요.",
  },
};
export const ReadOnly: Story = {
  args: { availability: "read-only", defaultValue: "hello@example.com" },
};
export const Disabled: Story = { args: { availability: "disabled" } };
export const PrefixAndSuffix: Story = {
  args: {
    label: "소요 시간",
    qualifier: "선택",
    defaultValue: "15",
    placeholder: "예: 30",
    purpose: "text",
    adornment: "prefix-suffix",
    supporting: "none",
  },
};
export const TrailingAction: Story = {
  args: { purpose: "search", label: "검색", adornment: "action", defaultValue: "말랑" },
};
export const Counter: Story = { args: { defaultValue: "hello", counterMaxLength: 30 } };
