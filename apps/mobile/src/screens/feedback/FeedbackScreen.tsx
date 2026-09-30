import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { announce } from "../../lib/accessibility";
import { feedbackMessageMaxLength, feedbackRatings } from "../../lib/feedback-api";
import type { FeedbackRating } from "../../lib/feedback.contract";
import { useUiCopy } from "../../lib/ui-copy";

import type { FeedbackScreenProps, FeedbackStatus } from "./feedback.contract";

import "./feedback-screen.css";

// 머리(나가기 · 제목)는 프로필 화면과 같은 모양입니다. 흐름: 별점(필수, 1~5) → 글(선택, 500자) → 보내기.
// 보내면 폼 대신 감사 문구가 서고 낭독합니다. 실패하면 폼이 남고 실패 문구를 읽어 줍니다.
export function FeedbackScreen({ onSubmit, onExit }: FeedbackScreenProps): ReactNode {
  const copy = useUiCopy();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FeedbackStatus>("editing");

  const handleSend = async (): Promise<void> => {
    if (rating === null || status === "sending") return;
    setStatus("sending");
    const ok = await onSubmit(rating, message);
    setStatus(ok ? "sent" : "failed");
    announce(ok ? copy.feedback.sent : copy.feedback.failed);
  };

  return (
    <view className="feedback-screen">
      <view className="feedback-screen-header">
        <view className="feedback-screen-exit" data-testid="feedback-screen-exit">
          <RoundButton
            accessibilityLabel={copy.common.backToSettings}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
            bindtap={onExit}
          />
        </view>
        <text
          className="feedback-screen-title"
          data-testid="feedback-screen-title"
          accessibility-traits="header"
        >
          {copy.feedback.title}
        </text>
      </view>

      <scroll-view
        className="feedback-screen-scroll"
        data-testid="feedback-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {status === "sent" ? (
          <view className="feedback-screen-body">
            <text className="feedback-screen-sent" data-testid="feedback-screen-sent">
              {copy.feedback.sent}
            </text>
          </view>
        ) : (
          <view className="feedback-screen-body">
            <text className="feedback-screen-question">{copy.feedback.ratingQuestion}</text>
            <view data-testid="feedback-screen-rating">
              <OptionSelector
                groupLabel={copy.feedback.ratingQuestion}
                options={feedbackRatings.map((value) => ({
                  id: String(value),
                  label: `${value} · ${copy.feedback.ratingOption[value]}`,
                }))}
                selectedIds={rating === null ? [] : [String(rating)]}
                selection="single"
                commit="immediate"
                variant="outlined"
                size="s"
                onChange={(ids) => {
                  const next = feedbackRatings.find((value) => String(value) === ids[0]);
                  if (next !== undefined) setRating(next);
                }}
              />
            </view>
            <view data-testid="feedback-screen-message">
              <TextField
                label={copy.feedback.messageLabel}
                accessibilityLabel={copy.feedback.messageLabel}
                availability={status === "sending" ? "read-only" : "enabled"}
                counter={{ maxLength: feedbackMessageMaxLength }}
                bindinput={setMessage}
              />
            </view>
            {status === "failed" ? (
              <text className="feedback-screen-failed" data-testid="feedback-screen-failed">
                {copy.feedback.failed}
              </text>
            ) : null}
            <view data-testid="feedback-screen-send">
              <Button
                label={copy.feedback.send}
                variant="brand"
                size="xl"
                width="fill"
                disabled={rating === null}
                loading={status === "sending"}
                bindtap={() => void handleSend()}
              />
            </view>
          </view>
        )}
      </scroll-view>
    </view>
  );
}
