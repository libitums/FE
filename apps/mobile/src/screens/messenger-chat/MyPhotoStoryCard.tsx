import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { myStoriesTestIds as ids, type MyStory } from "./my-stories.contract";
import { StoryOverlays } from "./MyStoryReactions";

import "./my-stories.css";

/**
 * 사진 스토리 카드(ADR-0199, 시안 14번) — 내 사진(서명 주소, 비공개 버킷) 위에 얹은 단어 · 글을 편집 때 자리 그대로. 확인 중(checking)이면
 * 위에 「Checking your photo」 띠(나에게만 보임). 주소를 못 만들면 사진 자리에 어두운 바탕만.
 */
export function MyPhotoStoryCard({
  story,
  photoUrl,
}: {
  readonly story: MyStory;
  readonly photoUrl?: (imagePath: string) => Promise<string | null>;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.photo;
  const [url, setUrl] = useState<string | null>(null);
  const path = story.imagePath;

  useEffect(() => {
    if (path === null || photoUrl === undefined) return undefined;
    let live = true;
    void photoUrl(path)
      .catch(() => null)
      .then((signed) => {
        if (live) setUrl(signed);
      });
    return () => {
      live = false;
    };
  }, [path, photoUrl]);

  return (
    <view className="my-story-text-card my-story-photo-bg" data-testid={ids.photoCard}>
      {url === null ? null : (
        <image
          className="my-story-photo"
          src={url}
          mode="aspectFill"
          data-testid={ids.storyPhoto}
          accessibility-element={true}
          accessibility-label={copy.label}
        />
      )}
      <StoryOverlays overlays={story.overlays} />
      {story.status === "checking" ? (
        <view
          className="my-story-checking"
          data-testid={ids.photoChecking}
          flatten={false}
          accessibility-element={true}
          accessibility-label={`${copy.checkingTitle}. ${copy.checkingBody}`}
        >
          <text className="my-story-checking-title" accessibility-elements-hidden={true}>
            {copy.checkingTitle}
          </text>
          <text className="my-story-checking-body" accessibility-elements-hidden={true}>
            {copy.checkingBody}
          </text>
        </view>
      ) : null}
    </view>
  );
}
