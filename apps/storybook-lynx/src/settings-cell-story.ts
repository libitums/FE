import type { Motion } from "@libitums/ui-lynx/motion";
import { normalizeStoryMotion } from "./story-motion";

export type SettingsCellStoryArgs = {
  readonly variant: "navigation" | "toggle" | "group";
  readonly leading: "none" | "avatar";
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly motion: Motion;
};

export function normalizeSettingsCellStoryArgs(input: unknown): SettingsCellStoryArgs {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    variant: args.variant === "toggle" || args.variant === "group" ? args.variant : "navigation",
    leading: args.leading === "avatar" ? "avatar" : "none",
    title: typeof args.title === "string" && args.title.trim() ? args.title : "알림 설정",
    description: typeof args.description === "string" ? args.description : "",
    value: typeof args.value === "string" ? args.value : "",
    checked: args.checked === true,
    disabled: args.disabled === true,
    focused: args.focused === true,
    motion: normalizeStoryMotion(args.motion),
  };
}
