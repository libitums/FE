import { root, useInitData } from "@lynx-js/react";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import { normalizeChatBubbleStoryArgs } from "../chat-bubble-story";
import "./story-canvas.css";

function App() {
  const args = normalizeChatBubbleStoryArgs(useInitData());

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Chat Bubble</text>
        {args.direction === "incoming" ? (
          <ChatBubble
            contentLanguage={args.contentLanguage}
            direction="incoming"
            languageTag={args.languageTag}
            message={args.message}
            size={args.size}
            speaker={args.speaker}
          />
        ) : (
          <ChatBubble
            contentLanguage={args.contentLanguage}
            delivery={args.delivery}
            direction="outgoing"
            languageTag={args.languageTag}
            message={args.message}
            size={args.size}
            speaker={args.speaker}
          />
        )}
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
