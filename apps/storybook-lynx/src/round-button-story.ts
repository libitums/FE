import type { RoundButtonSize, RoundButtonVariant } from "@libitums/ui-lynx/round-button";

export type RoundButtonInitData = {
  readonly accessibilityLabel: string;
  readonly icon: "info-02";
  readonly variant: RoundButtonVariant;
  readonly size: RoundButtonSize;
  readonly disabled: boolean;
  readonly loading: boolean;
};

export type RoundButtonStoryActionEnvelope = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onTap";
  readonly args: readonly [accessibilityLabel: string];
};

export type RoundButtonStoryBridge = (envelope: RoundButtonStoryActionEnvelope) => void;

const variants = new Set<RoundButtonVariant>(["neutral", "brand"]);
const sizes = new Set<RoundButtonSize>(["s", "m", "l", "xl"]);

export function normalizeRoundButtonStoryArgs(input: unknown): RoundButtonInitData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const accessibilityLabel =
    typeof args.accessibilityLabel === "string" && args.accessibilityLabel.trim()
      ? args.accessibilityLabel
      : "정보";
  const variant = variants.has(args.variant as RoundButtonVariant)
    ? (args.variant as RoundButtonVariant)
    : "neutral";
  const size = sizes.has(args.size as RoundButtonSize) ? (args.size as RoundButtonSize) : "m";

  return {
    accessibilityLabel,
    icon: "info-02",
    variant,
    size,
    disabled: args.disabled === true,
    loading: args.loading === true,
  };
}

export function dispatchRoundButtonStoryTap(
  data: RoundButtonInitData,
  bridge: RoundButtonStoryBridge,
): boolean {
  if (data.disabled || data.loading) return false;
  bridge({
    channel: "STORYBOOK_ACTION",
    name: "onTap",
    args: [data.accessibilityLabel],
  });
  return true;
}
