import type { CardDirection, CardPadding } from "@libitums/ui-lynx/card";

export type CardInteraction = "static" | "interactive";

export type CardInitData = {
  readonly padding: CardPadding;
  readonly interaction: CardInteraction;
  readonly direction: CardDirection;
  readonly title: string;
  readonly overline: string;
  readonly body: string;
  readonly showMedia: boolean;
};

export type CardStoryActionEnvelope = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onTap";
  readonly args: readonly [title: string];
};

export type CardStoryBridge = (envelope: CardStoryActionEnvelope) => void;

const paddings = new Set<CardPadding>(["m", "l"]);
const interactions = new Set<CardInteraction>(["static", "interactive"]);
const directions = new Set<CardDirection>(["ltr", "rtl"]);

export function normalizeCardStoryArgs(input: unknown): CardInitData {
  const args =
    input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const padding = paddings.has(args.padding as CardPadding) ? (args.padding as CardPadding) : "m";
  const interaction = interactions.has(args.interaction as CardInteraction)
    ? (args.interaction as CardInteraction)
    : "static";
  const direction = directions.has(args.direction as CardDirection)
    ? (args.direction as CardDirection)
    : "ltr";

  return {
    padding,
    interaction,
    direction,
    title: typeof args.title === "string" && args.title.trim() ? args.title : "오늘의 학습",
    overline: typeof args.overline === "string" ? args.overline : "추천",
    body:
      typeof args.body === "string" && args.body.trim()
        ? args.body
        : "카페에서 자연스럽게 주문하는 표현을 연습해 보세요.",
    showMedia: args.showMedia === true,
  };
}

export function dispatchCardStoryTap(data: CardInitData, bridge: CardStoryBridge): boolean {
  if (data.interaction !== "interactive") return false;
  bridge({ channel: "STORYBOOK_ACTION", name: "onTap", args: [data.title] });
  return true;
}
