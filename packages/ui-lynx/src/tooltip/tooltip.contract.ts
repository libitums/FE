export type TooltipAlignment = "start" | "center" | "end";
export type TooltipArrow = "on" | "off";
export type TooltipContentLanguage = "ui" | "learning";
export type TooltipDirection = "ltr" | "rtl";
export type TooltipPlacement = "top" | "bottom" | "start" | "end";
export type TooltipTone = "brand" | "neutral";
export type TooltipVisibility = "hidden" | "visible";

export type TooltipRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type TooltipSize = {
  readonly width: number;
  readonly height: number;
};

export type TooltipLayoutInput = {
  readonly trigger: TooltipRect;
  readonly bubble: TooltipSize;
  readonly boundary: TooltipRect;
  readonly placement?: TooltipPlacement;
  readonly alignment?: TooltipAlignment;
  readonly arrow?: TooltipArrow;
  readonly direction?: TooltipDirection;
};

export type TooltipLayout = {
  readonly left: number;
  readonly top: number;
  readonly placement: TooltipPlacement;
  readonly arrow: TooltipArrow;
  readonly arrowOffset?: number;
};

export type TooltipProps = {
  readonly message: string;
  readonly placement?: TooltipPlacement;
  readonly alignment?: TooltipAlignment;
  readonly arrow?: TooltipArrow;
  readonly tone?: TooltipTone;
  readonly visibility?: TooltipVisibility;
  readonly direction?: TooltipDirection;
  readonly contentLanguage?: TooltipContentLanguage;
  readonly languageTag?: string;
  readonly layout?: TooltipLayout;
};

export type TooltipContract = {
  readonly accessibilityElement: boolean;
  readonly alignment: TooltipAlignment;
  readonly arrow: TooltipArrow;
  readonly className: string;
  readonly contentLanguage: TooltipContentLanguage;
  readonly direction: TooltipDirection;
  readonly languageTag?: string;
  readonly layout?: TooltipLayout;
  readonly placement: TooltipPlacement;
  readonly tone: TooltipTone;
  readonly visibility: TooltipVisibility;
};

export const TOOLTIP_BUBBLE_GAP = 8;
export const TOOLTIP_BOUNDARY_PADDING = 16;
export const TOOLTIP_ARROW_HALF_BASE = 6;
export const TOOLTIP_ARROW_EDGE_GAP = 12;

function oppositePlacement(placement: TooltipPlacement): TooltipPlacement {
  if (placement === "top") return "bottom";
  if (placement === "bottom") return "top";
  if (placement === "start") return "end";
  return "start";
}

function isHorizontalPlacement(placement: TooltipPlacement): boolean {
  return placement === "top" || placement === "bottom";
}

function physicalSide(
  placement: TooltipPlacement,
  direction: TooltipDirection,
): "top" | "bottom" | "left" | "right" {
  if (placement === "top" || placement === "bottom") return placement;
  if (placement === "start") return direction === "ltr" ? "left" : "right";
  return direction === "ltr" ? "right" : "left";
}

function alignedCrossPosition(
  input: TooltipLayoutInput,
  placement: TooltipPlacement,
  alignment: TooltipAlignment,
  direction: TooltipDirection,
): number {
  const { trigger, bubble } = input;
  if (!isHorizontalPlacement(placement)) {
    if (alignment === "start") return trigger.y;
    if (alignment === "end") return trigger.y + trigger.height - bubble.height;
    return trigger.y + (trigger.height - bubble.height) / 2;
  }

  const logicalAlignment =
    direction === "rtl" && alignment !== "center"
      ? alignment === "start"
        ? "end"
        : "start"
      : alignment;
  if (logicalAlignment === "start") return trigger.x;
  if (logicalAlignment === "end") return trigger.x + trigger.width - bubble.width;
  return trigger.x + (trigger.width - bubble.width) / 2;
}

function positionFor(
  input: TooltipLayoutInput,
  placement: TooltipPlacement,
  alignment: TooltipAlignment,
  direction: TooltipDirection,
): { left: number; top: number } {
  const { trigger, bubble } = input;
  const side = physicalSide(placement, direction);
  const cross = alignedCrossPosition(input, placement, alignment, direction);

  if (side === "top") {
    return { left: cross, top: trigger.y - bubble.height - TOOLTIP_BUBBLE_GAP };
  }
  if (side === "bottom") {
    return { left: cross, top: trigger.y + trigger.height + TOOLTIP_BUBBLE_GAP };
  }
  if (side === "left") {
    return { left: trigger.x - bubble.width - TOOLTIP_BUBBLE_GAP, top: cross };
  }
  return { left: trigger.x + trigger.width + TOOLTIP_BUBBLE_GAP, top: cross };
}

function mainAxisOverflow(
  input: TooltipLayoutInput,
  placement: TooltipPlacement,
  position: { left: number; top: number },
  direction: TooltipDirection,
): number {
  const { bubble, boundary } = input;
  const side = physicalSide(placement, direction);
  const minX = boundary.x + TOOLTIP_BOUNDARY_PADDING;
  const maxX = boundary.x + boundary.width - TOOLTIP_BOUNDARY_PADDING;
  const minY = boundary.y + TOOLTIP_BOUNDARY_PADDING;
  const maxY = boundary.y + boundary.height - TOOLTIP_BOUNDARY_PADDING;
  if (side === "top") return Math.max(0, minY - position.top);
  if (side === "bottom") return Math.max(0, position.top + bubble.height - maxY);
  if (side === "left") return Math.max(0, minX - position.left);
  return Math.max(0, position.left + bubble.width - maxX);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function resolveTooltipLayout(input: TooltipLayoutInput): TooltipLayout {
  const alignment = input.alignment ?? "center";
  const arrow = input.arrow ?? "on";
  const direction = input.direction ?? "ltr";
  const requestedPlacement = input.placement ?? "top";
  const opposite = oppositePlacement(requestedPlacement);
  const requestedPosition = positionFor(input, requestedPlacement, alignment, direction);
  const oppositePosition = positionFor(input, opposite, alignment, direction);
  const requestedOverflow = mainAxisOverflow(
    input,
    requestedPlacement,
    requestedPosition,
    direction,
  );
  const oppositeOverflow = mainAxisOverflow(input, opposite, oppositePosition, direction);
  const placement = oppositeOverflow < requestedOverflow ? opposite : requestedPlacement;
  const initial = placement === requestedPlacement ? requestedPosition : oppositePosition;
  const horizontal = isHorizontalPlacement(placement);
  const minimumCross = horizontal
    ? input.boundary.x + TOOLTIP_BOUNDARY_PADDING
    : input.boundary.y + TOOLTIP_BOUNDARY_PADDING;
  const maximumCross = horizontal
    ? input.boundary.x + input.boundary.width - TOOLTIP_BOUNDARY_PADDING - input.bubble.width
    : input.boundary.y + input.boundary.height - TOOLTIP_BOUNDARY_PADDING - input.bubble.height;
  const left = horizontal ? clamp(initial.left, minimumCross, maximumCross) : initial.left;
  const top = horizontal ? initial.top : clamp(initial.top, minimumCross, maximumCross);
  const target = horizontal
    ? input.trigger.x + input.trigger.width / 2 - left
    : input.trigger.y + input.trigger.height / 2 - top;
  const bubbleCrossSize = horizontal ? input.bubble.width : input.bubble.height;
  const minimumArrowCenter = TOOLTIP_ARROW_EDGE_GAP + TOOLTIP_ARROW_HALF_BASE;
  const maximumArrowCenter = bubbleCrossSize - minimumArrowCenter;
  const arrowFits = target >= minimumArrowCenter && target <= maximumArrowCenter;

  return {
    left,
    top,
    placement,
    arrow: arrow === "on" && arrowFits ? "on" : "off",
    ...(arrow === "on" && arrowFits ? { arrowOffset: target } : {}),
  };
}

function requireMessage(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Tooltip message must not be empty");
  }
  return value;
}

export function getTooltipContract(props: TooltipProps): TooltipContract {
  requireMessage(props.message);
  const alignment = props.alignment ?? "center";
  const arrow = props.arrow ?? "on";
  const contentLanguage = props.contentLanguage ?? "ui";
  const direction = props.direction ?? "ltr";
  const languageTag = props.languageTag?.trim();
  const placement = props.placement ?? "top";
  const tone = props.tone ?? "neutral";
  const visibility = props.visibility ?? "visible";
  const renderedPlacement = props.layout?.placement ?? placement;
  const renderedArrow = props.layout?.arrow ?? arrow;

  if (contentLanguage === "learning" && !languageTag) {
    throw new Error("Tooltip languageTag is required for learning content");
  }

  return {
    accessibilityElement: visibility === "visible",
    alignment,
    arrow,
    className: [
      "ui-lynx-tooltip",
      `ui-lynx-tooltip-${renderedPlacement}`,
      `ui-lynx-tooltip-align-${alignment}`,
      `ui-lynx-tooltip-arrow-${renderedArrow}`,
      `ui-lynx-tooltip-tone-${tone}`,
      `ui-lynx-tooltip-${visibility}`,
      `ui-lynx-tooltip-${direction}`,
      props.layout ? "ui-lynx-tooltip-positioned" : undefined,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" "),
    contentLanguage,
    direction,
    ...(languageTag ? { languageTag } : {}),
    ...(props.layout ? { layout: props.layout } : {}),
    placement,
    tone,
    visibility,
  };
}
