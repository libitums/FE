import type { AvatarAccessibility, AvatarSize } from "@libitums/ui-lynx/avatar";

export type AvatarStoryContent = "image" | "initials" | "placeholder" | "broken-image";

export type AvatarStoryArgs = {
  readonly content: AvatarStoryContent;
  readonly name: string;
  readonly size: AvatarSize;
  readonly accessibility: AvatarAccessibility;
  readonly showAllSizes: boolean;
};

const contents = new Set<AvatarStoryContent>(["image", "initials", "placeholder", "broken-image"]);
const sizes = new Set<AvatarSize>(["xs", "sm", "md", "lg", "xl"]);
const accessibilities = new Set<AvatarAccessibility>(["label", "hidden"]);

export function normalizeAvatarStoryArgs(input: unknown): AvatarStoryArgs {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    content: contents.has(args.content as AvatarStoryContent)
      ? (args.content as AvatarStoryContent)
      : "initials",
    name: typeof args.name === "string" ? args.name : "Kim Ray",
    size: sizes.has(args.size as AvatarSize) ? (args.size as AvatarSize) : "md",
    accessibility: accessibilities.has(args.accessibility as AvatarAccessibility)
      ? (args.accessibility as AvatarAccessibility)
      : "label",
    showAllSizes: args.showAllSizes === true,
  };
}
