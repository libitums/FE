import { root, useInitData } from "@lynx-js/react";
import { Avatar } from "@libitums/ui-lynx/avatar";
import type { AvatarSize } from "@libitums/ui-lynx/avatar";

import type { AvatarStoryArgs } from "../avatar-story";
import { normalizeAvatarStoryArgs } from "../avatar-story";
import "./avatar-story.css";
import "./story-canvas.css";

const sizes: readonly AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];
const imageSource =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=192&q=80";
const brokenImageSource = "https://invalid.example/avatar.png";

function getImageSource(content: AvatarStoryArgs["content"]): string | undefined {
  if (content === "image") return imageSource;
  if (content === "broken-image") return brokenImageSource;
  return undefined;
}

function App() {
  const data = normalizeAvatarStoryArgs(useInitData() as Partial<AvatarStoryArgs>);
  const name = data.content === "placeholder" ? undefined : data.name;

  return (
    <view className="story-canvas">
      <view className="story-card avatar-story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Avatar</text>
        {data.showAllSizes ? (
          <view className="avatar-story-sizes">
            {sizes.map((size) => (
              <view className="avatar-story-size-item" key={size}>
                <Avatar
                  size={size}
                  name={name}
                  imageSource={getImageSource(data.content)}
                  accessibility={data.accessibility}
                />
                <text className="avatar-story-size-label">{size.toUpperCase()}</text>
              </view>
            ))}
          </view>
        ) : (
          <view className="avatar-story-example">
            <Avatar
              size={data.size}
              name={name}
              imageSource={getImageSource(data.content)}
              accessibility={data.accessibility}
            />
            <view className="avatar-story-copy">
              <text className="avatar-story-name">{data.name || "이름 없음"}</text>
              <text className="avatar-story-description">Avatar 바깥에서 이름을 조합합니다.</text>
            </view>
          </view>
        )}
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
