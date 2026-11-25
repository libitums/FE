import type { ReactNode } from "@lynx-js/react";

import { stickerSizeOf, type StickerWords } from "./my-story-sticker-size";
import { storyTextLines, textBoxSizeOf } from "./my-story-text";

// 바탕 위 글자 — 글 상자의 줄 · 단어 스티커의 글자 셋. 편집(MyStorySticker) · 보기(MyTextStoryCard)가 같은 함수로 그립니다.

/** 글 상자의 줄들 — 정해진 줄(`storyTextLines`)을 한 줄씩, 글자 크기에 크기를 곱해 그립니다(편집 · 보기 같은 함수). */
export function StoryTextLines({
  ko,
  color: ink,
  size,
}: {
  readonly ko: string;
  readonly color: string;
  readonly size: number;
}): ReactNode {
  const { fontSize, lineHeight } = textBoxSizeOf(size, size);
  return storyTextLines(ko).map((line, index) => (
    <text
      key={index}
      className={`my-story-text-box-ko my-story-ink-${ink}`}
      style={{ fontSize, lineHeight }}
      accessibility-elements-hidden={true}
    >
      {line}
    </text>
  ));
}

/** 단어 스티커의 글자 셋(단어 · 로마자 · 뜻) — 확정 크기를 곱한 글자 크기로 그립니다(편집 · 보기 같은 함수). 빈 줄은 그리지 않습니다. */
export function StickerWordLines({
  words,
  size,
}: {
  readonly words: StickerWords;
  readonly size: number;
}): ReactNode {
  const each = stickerSizeOf(size, size);
  return (
    <>
      <text
        className="my-story-sticker-ko"
        style={{ ...each.ko, whiteSpace: "nowrap" }}
        accessibility-elements-hidden={true}
      >
        {words.ko}
      </text>
      {words.roman === "" ? null : (
        <text
          className="my-story-sticker-roman"
          style={{ ...each.roman, whiteSpace: "nowrap" }}
          accessibility-elements-hidden={true}
        >
          {words.roman}
        </text>
      )}
      {words.meaning === "" ? null : (
        <text
          className="my-story-sticker-meaning"
          style={{ ...each.meaning, whiteSpace: "nowrap" }}
          accessibility-elements-hidden={true}
        >
          {words.meaning}
        </text>
      )}
    </>
  );
}
