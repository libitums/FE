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
  /** 누구의 말풍선 위인가 — 기본 me(내 답장), them이면 인물이 내 스토리에 단 반응(ADR-0191 D2). */
  readonly from?: "me" | "them";
};

export type StoryQuoteBarProps = {
  readonly quote: ChatStoryQuote;
  readonly name: string;
  readonly onRemove: () => void;
};

/** 내 말풍선 위 스토리 인용 카드(ADR-0178 D5, 시안 3번) — 캡션 · 그림 · 한 줄 · Story · 경과. 낭독은 한 덩어리입니다. */
export function StoryQuoteCard({ quote, name, now, from = "me" }: StoryQuoteCardProps): ReactNode {
  const all = useUiCopy().messengerChat;
  const copy = all.stories;
  const imageUrlOf = useContext(StoryImageContext);
  const imageUrl = quote.imagePath === null ? null : imageUrlOf(quote.imagePath);
  const age = quote.postedAt === null ? null : copy.age(storyAgeOf(quote.postedAt, now));
  // 지운 내 스토리(ADR-0194)는 「Deleted story」만 남습니다 — 단어 · 시각은 서버에서도 지워졌습니다.
  if (quote.kind === "deleted")
    return (
      <view
        className="story-quote"
        data-testid={ids.quote}
        accessibility-element={true}
        accessibility-label={all.myStories.quote.deletedLabel}
      >
        <view className="story-quote-card" accessibility-elements-hidden={true}>
          <view className="story-quote-body">
            <text className="story-quote-meta">{all.myStories.quote.deleted}</text>
          </view>
        </view>
      </view>
    );
  // 내 스토리 인용(ADR-0194 · ADR-0191) — 인물의 반응 위는 「Replied to your story」, 내 글 위(옛 Answer 띠)는 「You answered …」.
  const caption =
    quote.kind === "mine"
      ? from === "them"
        ? all.myStories.quote.reacted
        : all.myStories.quote.mine
      : copy.reply.caption(name);
  return (
    <view
      className={from === "them" ? "story-quote incoming" : "story-quote"}
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
  const all = useUiCopy().messengerChat;
  const copy = all.stories;
  const title = copy.reply.replying(name);
  return (
    <view className="story-quote-bar" data-testid={ids.quoteBar}>
      <view
        className="story-quote-bar-body"
        accessibility-element={true}
        accessibility-label={spokenOf(copy.labelSeparator, [title, quote.line])}
      >
        <text className="story-quote-bar-title" accessibility-elements-hidden={true}>
          {title}
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
