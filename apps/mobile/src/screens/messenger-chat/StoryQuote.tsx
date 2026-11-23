import { useContext } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import cross from "@libitums/icons/lynx/cross";

import { useUiCopy } from "../../lib/ui-copy";
import { spokenOf, storyAgeOf } from "./friend-stories";
import { friendStoriesTestIds as ids, type ChatStoryQuote } from "./friend-stories.contract";
import { StoryImageContext } from "./story-image-context";

import "./story-viewer.css";

export type StoryQuoteCardProps = {
  readonly quote: ChatStoryQuote;
  readonly name: string;
  readonly now: number;
};

export type StoryQuoteBarProps = {
  readonly quote: ChatStoryQuote;
  readonly name: string;
  readonly onRemove: () => void;
};

/** 내 말풍선 위 스토리 인용 카드(ADR-0178 D5, 시안 3번) — 캡션 · 그림 · 한 줄 · Story · 경과. 낭독은 한 덩어리입니다. */
export function StoryQuoteCard({ quote, name, now }: StoryQuoteCardProps): ReactNode {
  const copy = useUiCopy().messengerChat.stories;
  const imageUrlOf = useContext(StoryImageContext);
  const imageUrl = quote.imagePath === null ? null : imageUrlOf(quote.imagePath);
  const age = quote.postedAt === null ? null : copy.age(storyAgeOf(quote.postedAt, now));
  const caption = copy.reply.caption(name);
  return (
    <view
      className="story-quote"
      data-testid={ids.quote}
      accessibility-element={true}
      accessibility-label={spokenOf(copy.listSeparator, [
        spokenOf(copy.labelSeparator, [caption, quote.line]),
        copy.reply.storyMeta(age),
      ])}
    >
      <text className="story-quote-caption" accessibility-elements-hidden={true}>
        {caption}
      </text>
      <view className="story-quote-card" accessibility-elements-hidden={true}>
        {imageUrl === null ? null : (
          <image className="story-quote-image" src={imageUrl} mode="aspectFill" />
        )}
        <view className="story-quote-body">
          <text className="story-quote-line">{quote.line}</text>
          <text className="story-quote-meta">{copy.reply.storyMeta(age)}</text>
        </view>
      </view>
    </view>
  );
}

/** 입력 줄 위 인용 띠(ADR-0178 D5) — 다음에 보내는 글에 스토리 인용이 실립니다. ×로 뗍니다. */
export function StoryQuoteBar({ quote, name, onRemove }: StoryQuoteBarProps): ReactNode {
  const copy = useUiCopy().messengerChat.stories;
  return (
    <view className="story-quote-bar" data-testid={ids.quoteBar}>
      <view
        className="story-quote-bar-body"
        accessibility-element={true}
        accessibility-label={spokenOf(copy.labelSeparator, [copy.reply.replying(name), quote.line])}
      >
        <text className="story-quote-bar-title" accessibility-elements-hidden={true}>
          {copy.reply.replying(name)}
        </text>
        <text className="story-quote-bar-line" accessibility-elements-hidden={true}>
          {quote.line}
        </text>
      </view>
      <view
        className="story-quote-bar-remove"
        data-testid={ids.quoteBarRemove}
        accessibility-element={true}
        accessibility-label={copy.reply.removeQuote}
        accessibility-traits="button"
        accessibility-enable-tap={true}
        flatten={false}
        bindtap={() => {
          "background only";
          onRemove();
        }}
      >
        <svg className="story-quote-bar-icon" content={cross} current-color={color.fg.neutral} />
      </view>
    </view>
  );
}
