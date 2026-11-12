import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import dislike from "@libitums/icons/lynx/dislike";
import like from "@libitums/icons/lynx/like";

import { useUiCopy } from "../../lib/ui-copy";
import type { ChatRating } from "./chat-feedback.contract";
import { chatFeedbackTestIds as ids } from "./chat-feedback.contract";

import "./chat-feedback.css";

export type RatingButtonsProps = {
  readonly rating: ChatRating | undefined;
  readonly onGood: () => void;
  readonly onBad: () => void;
};

type ThumbProps = {
  readonly testId: string;
  readonly icon: string;
  readonly label: string;
  readonly on: boolean;
  readonly onTap: () => void;
};

function Thumb({ testId, icon, label, on, onTap }: ThumbProps): ReactNode {
  return (
    <view
      className={`chat-rating-button${on ? " chat-rating-button-on" : ""}`}
      id={testId}
      data-testid={testId}
      data-on={on ? "true" : "false"}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      accessibility-enable-tap={true}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg
        className="chat-rating-icon"
        content={icon}
        current-color={on ? color.brand.primary : color.fg["neutral-muted"]}
      />
    </view>
  );
}

// 가장 최근 캐릭터 글 아래 👍 👎(ADR-0129). 눌러 둔 쪽이 켜지고 낭독에 「selected」가 붙습니다.
export function RatingButtons({ rating, onGood, onBad }: RatingButtonsProps): ReactNode {
  const copy = useUiCopy().messengerChat.feedback;
  const good = rating?.value === "up";
  const bad = rating?.value === "down";
  return (
    <view className="chat-rating-row">
      <Thumb
        testId={ids.ratingGood}
        icon={like}
        label={good ? copy.goodSelected : copy.good}
        on={good}
        onTap={onGood}
      />
      <Thumb
        testId={ids.ratingBad}
        icon={dislike}
        label={bad ? copy.badSelected : copy.bad}
        on={bad}
        onTap={onBad}
      />
    </view>
  );
}

// 지난 캐릭터 글에 남은 평가 한 줄 — 「You liked this」 · 「You flagged this」.
export function RatingResult({ rating }: { readonly rating: ChatRating }): ReactNode {
  const copy = useUiCopy().messengerChat.feedback;
  const up = rating.value === "up";
  return (
    <view className="chat-rating-result" data-testid={ids.ratingResult} data-value={rating.value}>
      <svg
        className="chat-rating-icon"
        content={up ? like : dislike}
        current-color={color.fg["neutral-muted"]}
      />
      <text className="chat-rating-result-text">{up ? copy.liked : copy.flagged}</text>
    </view>
  );
}
