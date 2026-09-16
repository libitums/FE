import type {
  TooltipAlignment,
  TooltipArrow,
  TooltipContentLanguage,
  TooltipDirection,
  TooltipPlacement,
  TooltipTone,
  TooltipVisibility,
} from "@libitums/ui-lynx/tooltip";

export type TooltipStoryData = {
  readonly alignment: TooltipAlignment;
  readonly arrow: TooltipArrow;
  readonly contentLanguage: TooltipContentLanguage;
  readonly direction: TooltipDirection;
  readonly languageTag?: string;
  readonly message: string;
  readonly placement: TooltipPlacement;
  readonly tone: TooltipTone;
  readonly visibility: TooltipVisibility;
};

const alignments = new Set<TooltipAlignment>(["start", "center", "end"]);
const arrows = new Set<TooltipArrow>(["on", "off"]);
const contentLanguages = new Set<TooltipContentLanguage>(["ui", "learning"]);
const directions = new Set<TooltipDirection>(["ltr", "rtl"]);
const placements = new Set<TooltipPlacement>(["top", "bottom", "start", "end"]);
const tones = new Set<TooltipTone>(["brand", "neutral"]);
const visibilities = new Set<TooltipVisibility>(["hidden", "visible"]);

export function normalizeTooltipStoryArgs(input: unknown): TooltipStoryData {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const contentLanguage = contentLanguages.has(args.contentLanguage as TooltipContentLanguage)
    ? (args.contentLanguage as TooltipContentLanguage)
    : "ui";
  const languageTag =
    typeof args.languageTag === "string" && args.languageTag.trim()
      ? args.languageTag.trim()
      : undefined;

  return {
    alignment: alignments.has(args.alignment as TooltipAlignment)
      ? (args.alignment as TooltipAlignment)
      : "center",
    arrow: arrows.has(args.arrow as TooltipArrow) ? (args.arrow as TooltipArrow) : "on",
    contentLanguage,
    direction: directions.has(args.direction as TooltipDirection)
      ? (args.direction as TooltipDirection)
      : "ltr",
    ...(languageTag
      ? { languageTag }
      : contentLanguage === "learning"
        ? { languageTag: "en" }
        : {}),
    message:
      typeof args.message === "string" && args.message.trim()
        ? args.message
        : "이 기능에 대한 짧은 설명",
    placement: placements.has(args.placement as TooltipPlacement)
      ? (args.placement as TooltipPlacement)
      : "top",
    tone: tones.has(args.tone as TooltipTone) ? (args.tone as TooltipTone) : "neutral",
    visibility: visibilities.has(args.visibility as TooltipVisibility)
      ? (args.visibility as TooltipVisibility)
      : "visible",
  };
}
