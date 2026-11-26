import type { ReactNode } from "@lynx-js/react";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { playSound } from "../../lib/sound-effects";

import "./suggested-friends.css";
import "./friend-stories.css";

// 스토리 줄의 동그라미 하나(ADR-0178 D3 · ADR-0194) — 고리 · 얼굴 · 이름 · 둘째 줄. 낭독은 칸 하나(이름 · 경과 · 상태)로 읽습니다.

export type Ring = "unseen" | "seen" | "unmet";

export function StoryFace({
  testId,
  ring,
  name,
  avatarUrl,
  caption,
  captionTone,
  label,
  onTap,
  avatarName,
}: {
  readonly testId: string;
  readonly ring: Ring;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly caption: string;
  readonly captionTone: "muted" | "brand";
  readonly label: string;
  readonly onTap: () => void;
  /** 얼굴 글자 — 없으면 이름(내 스토리는 올린 단어). */
  readonly avatarName?: string;
}): ReactNode {
  function handleTap() {
    "background only";
    playSound("button");
    onTap();
  }
  return (
    <view
      className="story-item"
      data-testid={testId}
      data-state={ring}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={handleTap}
    >
      <view className={`story-ring story-ring-${ring}`}>
        <Avatar
          imageSource={avatarUrl ?? undefined}
          name={avatarName ?? name}
          size="lg"
          accessibility="hidden"
        />
      </view>
      <text
        className={ring === "seen" ? "story-name story-name-seen" : "story-name"}
        accessibility-elements-hidden={true}
      >
        {name}
      </text>
      <text
        className={captionTone === "brand" ? "story-caption story-caption-brand" : "story-caption"}
        accessibility-elements-hidden={true}
      >
        {caption}
      </text>
    </view>
  );
}
