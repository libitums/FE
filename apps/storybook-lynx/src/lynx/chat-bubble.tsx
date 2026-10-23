import { root, useInitData } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";
import { ChatBubble } from "@libitums/ui-lynx/chat-bubble";

import { normalizeChatBubbleStoryArgs } from "../chat-bubble-story";
import "./story-canvas.css";

function App() {
  const initData = useInitData();
  const args = normalizeChatBubbleStoryArgs(initData);
  const annotated = (initData as { annotated?: unknown } | null)?.annotated === true;
  const annotation = annotated
    ? { romanization: "hangugeo jalhasineyo!", meaning: "Your Korean is so good!" }
    : undefined;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Chat Bubble</text>
        <MotionProvider motion={args.motion}>
          {args.direction === "incoming" ? (
            <ChatBubble
              contentLanguage={args.contentLanguage}
              direction="incoming"
              languageTag={args.languageTag}
              message={args.message}
              reveal={args.reveal}
              size={args.size}
              speaker={args.speaker}
              annotation={annotation}
            />
          ) : (
            <ChatBubble
              contentLanguage={args.contentLanguage}
              delivery={args.delivery}
              direction="outgoing"
              languageTag={args.languageTag}
              message={args.message}
              reveal={args.reveal}
              size={args.size}
              speaker={args.speaker}
              annotation={annotation}
            />
          )}
        </MotionProvider>
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
