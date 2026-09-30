import { useEffect, useRef } from "@lynx-js/react";

import { getChatBubbleContract, type ChatBubbleProps } from "./chat-bubble.contract";
import { useTypewriter } from "../typewriter";

export function ChatBubble(props: ChatBubbleProps) {
  const contract = getChatBubbleContract(props);
  const reveal = props.reveal ?? "instant";
  const typing = useTypewriter({
    text: props.message,
    enabled: reveal === "typewriter",
    intervalMs: props.intervalMs,
    reducedMotion: props.reducedMotion,
  });
  const onRevealComplete = useRef(props.onRevealComplete);
  useEffect(() => {
    // oxlint-disable-next-line react/immutability -- ReactLynx useRef는 effect에서 갱신할 수 있는 mutable ref입니다.
    onRevealComplete.current = props.onRevealComplete;
  }, [props.onRevealComplete]);
  useEffect(() => {
    if (reveal === "typewriter" && typing.isComplete) onRevealComplete.current?.();
  }, [reveal, props.message, typing.isComplete]);

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-chat-bubble"
      data-language={contract.contentLanguage}
      data-delivery={contract.delivery}
      data-direction={contract.direction}
      data-lang={contract.languageTag}
      data-size={contract.size}
      data-status={typing.isComplete ? "ready" : "revealing"}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits="text"
      accessibility-value={contract.deliveryLabel}
    >
      <view className="ui-lynx-chat-bubble-message-slot" accessibility-elements-hidden={true}>
        <text
          className="ui-lynx-chat-bubble-message"
          style={{ visibility: "hidden" }}
          data-testid="ui-lynx-chat-bubble-measure"
        >
          {props.message}
        </text>
        <text
          className="ui-lynx-chat-bubble-message ui-lynx-chat-bubble-message-reveal"
          data-testid="ui-lynx-chat-bubble-message"
          accessibility-element={false}
        >
          {typing.visibleText || "\u200B"}
        </text>
      </view>
      {contract.translation ? (
        <text
          className="ui-lynx-chat-bubble-translation"
          data-testid="ui-lynx-chat-bubble-translation"
          accessibility-element={false}
          style={{ visibility: typing.isComplete ? "visible" : "hidden" }}
        >
          {contract.translation}
        </text>
      ) : null}
    </view>
  );
}
