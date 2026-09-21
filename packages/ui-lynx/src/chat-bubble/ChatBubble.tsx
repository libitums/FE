import type {} from "@lynx-js/react";

import { getChatBubbleContract, type ChatBubbleProps } from "./chat-bubble.contract";

export function ChatBubble(props: ChatBubbleProps) {
  const contract = getChatBubbleContract(props);

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-chat-bubble"
      data-language={contract.contentLanguage}
      data-delivery={contract.delivery}
      data-direction={contract.direction}
      data-lang={contract.languageTag}
      data-size={contract.size}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits="text"
      accessibility-value={contract.deliveryLabel}
    >
      <text className="ui-lynx-chat-bubble-message" accessibility-element={false}>
        {props.message}
      </text>
      {contract.translation ? (
        <text
          className="ui-lynx-chat-bubble-translation"
          data-testid="ui-lynx-chat-bubble-translation"
          accessibility-element={false}
        >
          {contract.translation}
        </text>
      ) : null}
    </view>
  );
}
