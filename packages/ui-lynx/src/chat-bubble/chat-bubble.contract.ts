export type ChatBubbleDirection = "incoming" | "outgoing";
export type ChatBubbleSize = "s" | "m" | "l";
export type ChatBubbleDelivery = "default" | "sending" | "sent" | "read" | "failed";
export type ChatBubbleContentLanguage = "ui" | "learning";

type ChatBubbleBaseProps = {
  readonly message: string;
  readonly speaker: string;
  readonly size?: ChatBubbleSize;
  readonly contentLanguage?: ChatBubbleContentLanguage;
  readonly languageTag?: string;
  /** 본문 아래 한 줄 더 싣는 번역. 비어 있으면 그리지 않습니다. */
  readonly translation?: string;
};

export type IncomingChatBubbleProps = ChatBubbleBaseProps & {
  readonly direction: "incoming";
  readonly delivery?: "default";
};

export type OutgoingChatBubbleProps = ChatBubbleBaseProps & {
  readonly direction: "outgoing";
  readonly delivery?: ChatBubbleDelivery;
};

export type ChatBubbleProps = IncomingChatBubbleProps | OutgoingChatBubbleProps;

export const chatBubbleDeliveryLabels = {
  default: undefined,
  sending: "보내는 중…",
  sent: "보냈어요",
  read: "읽었어요",
  failed: "보내지 못했어요",
} as const satisfies Readonly<Record<ChatBubbleDelivery, string | undefined>>;

export type ChatBubbleContract = {
  readonly accessibilityLabel: string;
  readonly className: string;
  readonly contentLanguage: ChatBubbleContentLanguage;
  readonly delivery: ChatBubbleDelivery;
  readonly deliveryLabel?: string;
  readonly direction: ChatBubbleDirection;
  readonly languageTag?: string;
  readonly size: ChatBubbleSize;
  readonly translation?: string;
};

function requireVisibleText(value: string, name: "message" | "speaker"): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must not be empty`);
  }
  return value;
}

export function getChatBubbleContract(props: ChatBubbleProps): ChatBubbleContract {
  const message = requireVisibleText(props.message, "message");
  const speaker = requireVisibleText(props.speaker, "speaker");
  const size = props.size ?? "m";
  const contentLanguage = props.contentLanguage ?? "ui";
  const languageTag = props.languageTag?.trim();

  if (contentLanguage === "learning" && !languageTag) {
    throw new Error("languageTag is required for learning content");
  }

  const delivery = props.direction === "incoming" ? "default" : (props.delivery ?? "default");
  const deliveryLabel = chatBubbleDeliveryLabels[delivery];
  const translation = props.translation?.trim() || undefined;

  return {
    accessibilityLabel: translation
      ? `${speaker}: ${message}, ${translation}`
      : `${speaker}: ${message}`,
    className: [
      "ui-lynx-chat-bubble",
      `ui-lynx-chat-bubble-${props.direction}`,
      `ui-lynx-chat-bubble-${size}`,
      `ui-lynx-chat-bubble-delivery-${delivery}`,
    ].join(" "),
    contentLanguage,
    delivery,
    ...(deliveryLabel ? { deliveryLabel } : {}),
    direction: props.direction,
    ...(languageTag ? { languageTag } : {}),
    size,
    ...(translation ? { translation } : {}),
  };
}
