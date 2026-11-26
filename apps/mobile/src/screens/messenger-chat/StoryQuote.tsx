import { useContext, useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import cross from "@libitums/icons/lynx/cross";

import { useUiCopy } from "../../lib/ui-copy";
import { spokenOf, storyAgeOf } from "./friend-stories";
import { friendStoriesTestIds as ids, type ChatStoryQuote } from "./friend-stories.contract";
import { ChatStoryHostContext as StoryHost } from "./chat-story-host-context";
import { chatStoryThumbOf } from "./chat-story-thumb";
import type { ChatStoryLookup } from "./chat-story-thumb.contract";
import { ChatStoryThumbFace } from "./ChatStoryThumb";
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

const NO_LOOKUP: ChatStoryLookup = { mine: null, friends: null, deleted: new Set() };

/**
 * 말풍선 위 스토리 인용(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩, 시안 37 ~ 39 · 40a) — 캡션 + 올린 그대로 9:16 작은 판(인물의 반응 위 118,
 * 내 답 위 96). 누르면 결선(`ChatStoryHostContext`)이 그 스토리를 엽니다. 낭독은 한 덩어리 — 캡션 · 한 줄 · 경과 · 열기(또는 Ended).
 */
export function StoryQuoteCard({ quote, name, now, from = "me" }: StoryQuoteCardProps): ReactNode {
  const all = useUiCopy().messengerChat;
  const copy = all.stories;
  const words = all.myStories.quote;
  const host = useContext(StoryHost);
  const imageUrlOf = useContext(StoryImageContext);
  const view = chatStoryThumbOf(quote, host?.lookup ?? NO_LOOKUP, now);
  // 판이 처음 설 때 그 종류의 목록을 한 번(결선이 묶음) — 지운 스토리는 받을 것이 없습니다.
  useEffect(() => {
    if (view.kind !== "deleted") host?.need(view.kind);
  }, []);
  // 내 스토리 인용(ADR-0194 · ADR-0191) — 인물의 반응 위는 「Replied to your story」, 내 글 위(옛 Answer 띠)는 「You answered …」.
  const caption =
    quote.kind === "mine" || quote.kind === "deleted"
      ? from === "them"
        ? words.reacted
        : words.mine
      : copy.reply.caption(name);
  const age = quote.postedAt === null ? null : copy.age(storyAgeOf(quote.postedAt, now));
  const tappable =
    host !== null && (view.kind === "friend" || (view.kind === "mine" && view.openable));
  const action = !tappable
    ? null
    : view.kind === "friend" && view.ended
      ? words.ended
      : words.openStory;
  const label =
    view.kind === "deleted"
      ? words.deletedLabel
      : spokenOf(copy.listSeparator, [
          spokenOf(copy.labelSeparator, [caption, quote.line]),
          copy.reply.storyMeta(age),
          ...(action === null ? [] : [action]),
        ]);
  return (
    <view
      className={from === "them" ? "story-quote incoming" : "story-quote"}
      data-testid={ids.quote}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits={tappable ? "button" : undefined}
      accessibility-enable-tap={tappable ? true : undefined}
      bindtap={() => {
        "background only";
        if (tappable) host?.open(quote);
      }}
    >
      <text className="story-quote-caption" accessibility-elements-hidden={true}>
        {caption}
      </text>
      <ChatStoryThumbFace
        view={view}
        incoming={from === "them"}
        imageUrl={
          view.kind === "friend" && view.imagePath !== null ? imageUrlOf(view.imagePath) : null
        }
        photoUrl={host?.photoUrl}
      />
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
