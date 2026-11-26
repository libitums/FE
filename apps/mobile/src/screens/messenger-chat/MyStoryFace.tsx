// 전체 화면 보기의 내 글 · 사진 스토리(ADR-0194 개정 ⟨보기⟩) — 바탕 · 얹은 것을 화면 가득.

import type { ReactNode } from "@lynx-js/react";

import type { MyStory } from "./my-stories.contract";
import { MyPhotoStoryCard } from "./MyPhotoStoryCard";
import { MyTextStoryCard } from "./MyStoryReactions";

import "./my-story-viewer.css";

/** 글 · 사진 스토리를 화면 가득 — 얹은 것은 편집 때 비율 자리 그대로(편집도 화면 가득), 위아래 그늘은 친구 스토리와 같음. */
export function MyStoryFace({
  story,
  insetTop,
  photoUrl,
}: {
  readonly story: MyStory;
  readonly insetTop: number;
  readonly photoUrl: ((imagePath: string) => Promise<string | null>) | undefined;
}): ReactNode {
  return (
    <>
      <view className="my-story-face">
        {story.kind === "photo" ? (
          <MyPhotoStoryCard story={story} {...(photoUrl === undefined ? {} : { photoUrl })} />
        ) : (
          <MyTextStoryCard story={story} />
        )}
      </view>
      <view
        className="story-viewer-shade-top"
        style={{ height: `${insetTop + 150}px` }}
        accessibility-elements-hidden={true}
      />
      <view className="story-viewer-shade-bottom" accessibility-elements-hidden={true} />
    </>
  );
}
