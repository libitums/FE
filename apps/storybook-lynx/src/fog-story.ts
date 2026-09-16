import type {
  FogColor,
  FogDirection,
  FogLayoutDirection,
  FogSize,
  FogVisibility,
} from "@libitums/ui-lynx/fog";

export type FogStoryArgs = {
  direction: FogDirection;
  size: FogSize;
  color: FogColor;
  visibility: FogVisibility;
  layoutDirection: FogLayoutDirection;
};

const directions = new Set<FogDirection>(["top", "bottom", "start", "end"]);
const sizes = new Set<FogSize>(["s", "m", "full"]);
const colors = new Set<FogColor>([
  "white",
  "surface-default",
  "surface-basement",
  "surface-floating",
  "dark",
]);
const visibilities = new Set<FogVisibility>(["hidden", "visible"]);
const layoutDirections = new Set<FogLayoutDirection>(["ltr", "rtl"]);

export function normalizeFogStoryArgs(input: unknown): FogStoryArgs {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    direction: directions.has(args.direction as FogDirection)
      ? (args.direction as FogDirection)
      : "bottom",
    size: sizes.has(args.size as FogSize) ? (args.size as FogSize) : "m",
    color: colors.has(args.color as FogColor) ? (args.color as FogColor) : "surface-default",
    visibility: visibilities.has(args.visibility as FogVisibility)
      ? (args.visibility as FogVisibility)
      : "visible",
    layoutDirection: layoutDirections.has(args.layoutDirection as FogLayoutDirection)
      ? (args.layoutDirection as FogLayoutDirection)
      : "ltr",
  };
}
