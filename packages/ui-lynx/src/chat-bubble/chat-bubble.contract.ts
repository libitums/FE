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
  /** 기본값은 instant입니다. 새로 도착한 메시지에만 typewriter를 지정합니다. */
  readonly reveal?: "instant" | "typewriter";
  readonly intervalMs?: number;
  readonly reducedMotion?: boolean;
  /** 타이핑 완료 후 스크롤 등 백그라운드 작업을 수행합니다. */
  readonly onRevealComplete?: () => void;
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
  sending: "Sending…",
  sent: "Sent",
  read: "Read",
  failed: "Couldn't send",
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
