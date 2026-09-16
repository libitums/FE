import type {
  ChatBubbleContentLanguage,
  ChatBubbleDelivery,
  ChatBubbleDirection,
  ChatBubbleSize,
} from "@libitums/ui-lynx/chat-bubble";

export type ChatBubbleStoryData = {
  readonly contentLanguage: ChatBubbleContentLanguage;
  readonly delivery: ChatBubbleDelivery;
  readonly direction: ChatBubbleDirection;
  readonly languageTag?: string;
  readonly message: string;
  readonly size: ChatBubbleSize;
  readonly speaker: string;
};

const directions = new Set<ChatBubbleDirection>(["incoming", "outgoing"]);
const sizes = new Set<ChatBubbleSize>(["s", "m", "l"]);
const deliveries = new Set<ChatBubbleDelivery>(["default", "sending", "sent", "read", "failed"]);
const contentLanguages = new Set<ChatBubbleContentLanguage>(["ui", "learning"]);

export function normalizeChatBubbleStoryArgs(input: unknown): ChatBubbleStoryData {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const direction = directions.has(args.direction as ChatBubbleDirection)
    ? (args.direction as ChatBubbleDirection)
    : "incoming";
  const contentLanguage = contentLanguages.has(args.contentLanguage as ChatBubbleContentLanguage)
    ? (args.contentLanguage as ChatBubbleContentLanguage)
    : "ui";
  const requestedDelivery = deliveries.has(args.delivery as ChatBubbleDelivery)
    ? (args.delivery as ChatBubbleDelivery)
    : "default";
  const languageTag =
    typeof args.languageTag === "string" && args.languageTag.trim()
      ? args.languageTag.trim()
      : undefined;

  return {
    contentLanguage,
    delivery: direction === "incoming" ? "default" : requestedDelivery,
    direction,
    ...(languageTag
      ? { languageTag }
      : contentLanguage === "learning"
        ? { languageTag: "en" }
        : {}),
    message:
      typeof args.message === "string" && args.message.trim()
        ? args.message
        : "오늘 하루는 어땠어?",
    size: sizes.has(args.size as ChatBubbleSize) ? (args.size as ChatBubbleSize) : "m",
    speaker: typeof args.speaker === "string" && args.speaker.trim() ? args.speaker : "말랑이",
  };
}
