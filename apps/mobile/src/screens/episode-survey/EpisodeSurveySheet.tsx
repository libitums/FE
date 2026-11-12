import { useEffect, useGlobalProps, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { TextField } from "@libitums/ui-lynx/text-field";

import {
  feedbackMessageMaxLength,
  feedbackMessageOf,
  feedbackRatings,
  surveyAsksMessage,
} from "../../lib/feedback-api";
import type { FeedbackRating } from "../../lib/feedback.contract";
import { announce } from "../../lib/accessibility";
import { tappableBottomInsetFrom } from "../../lib/safe-area";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { restoreAccessibilityFocus } from "../messenger-chat/chat-input-focus";

import "./episode-survey-sheet.css";

/** 글 단계 입력의 `id`입니다 — 별점을 고른 뒤 접근성 초점을 보내는 곳. */
export const episodeSurveyMessageInputId = "episode-survey-message-input";

/** 단계가 바뀐 다음 프레임입니다 — 새 입력이 서야 초점을 받을 수 있습니다. */
const NEXT_FRAME_MS = 16;

export type EpisodeSurveySheetProps = {
  readonly episodeTitle: string;
  /** 4 · 5점은 누르는 즉시, 1~3점은 글 단계를 거쳐 답이 됩니다. `message`는 보낸 글이거나 `null`. */
  readonly onAnswer: (rating: FeedbackRating, message: string | null) => void;
  /** 별점 단계의 `Not now` · 바깥 누름 · 닫기 · 끌어내리기 · 뒤로는 건너뛰기입니다. 글 단계에서는 `onAnswer(별점, null)`입니다. */
  readonly onSkip: () => void;
};

// 에피소드를 끝낸 뒤 맵 위에 한 번 뜨는 설문입니다(ADR-0036). 4 · 5점은 누르면 끝나고, 1~3점은 같은 시트에서
// 선택 글 칸으로 넘어갑니다(개정 2026-11-12). 글 단계에서 닫는 길은 모두 「그 별점 + 글 없음」의 답입니다 — 고른 별점을 버리지 않습니다.
export function EpisodeSurveySheet({
  episodeTitle,
  onAnswer,
  onSkip,
}: EpisodeSurveySheetProps): ReactNode {
  const copy = useUiCopy();
  // 패널 아래 여백의 `env(safe-area-inset-bottom)`은 이 호스트에서 0으로 풀려, Android 3버튼 바가
  // 건너뛰기 버튼의 아래쪽을 가립니다. 터치를 가로채는 높이만큼 시트가 스스로 비웁니다(iOS · 제스처는 0).
  const tappableBottom = tappableBottomInsetFrom(useGlobalProps());
  // 1~3점을 고른 뒤의 글 단계입니다. `null`이면 별점 단계.
  const [pending, setPending] = useState<FeedbackRating | null>(null);
  const [message, setMessage] = useState("");
  // 글 칸이 띄운 시스템 키보드 높이입니다. 호스트가 화면을 줄이지 않아(iOS) 시트가 그만큼 아래를 비워 키보드 위로 올라갑니다.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const close = (): void => {
    if (pending === null) onSkip();
    else onAnswer(pending, null);
  };
  // 1~3점을 고르면 누른 보기가 사라집니다. 스크린리더 초점이 사라진 노드에 남지 않게 다음 프레임에 글 칸으로 옮기고
  // (초점 → 낭독 순서), 고른 별점을 낭독해 받아들여졌음을 알립니다. 키보드는 띄우지 않습니다(a11y M1).
  useEffect(() => {
    if (pending === null) return undefined;
    const spoken = `${pending} · ${copy.feedback.ratingOption[pending]}`;
    const handle = setTimeout(() => {
      restoreAccessibilityFocus(episodeSurveyMessageInputId);
      announce(spoken);
    }, NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, [pending]);
  // 시스템 뒤로가기 = 보이는 닫는 길과 같은 결과입니다. 설문이 서 있는 동안만 등록됩니다.
  useLayerBack(close);
  return (
    <BottomSheet
      title={copy.feedback.survey.title}
      description={copy.feedback.survey.description(episodeTitle)}
      closeAccessibilityLabel={copy.feedback.survey.skip}
      ondismiss={close}
    >
      {pending === null ? (
        <view data-testid="episode-survey-options">
          <OptionSelector
            groupLabel={copy.feedback.survey.title}
            options={feedbackRatings.map((value) => ({
              id: String(value),
              label: `${value} · ${copy.feedback.ratingOption[value]}`,
            }))}
            selectedIds={[]}
            selection="single"
            commit="immediate"
            variant="outlined"
            size="s"
            onChange={() => undefined}
            onCommit={(id) => {
              const rating = feedbackRatings.find((value) => String(value) === id);
              if (rating === undefined) return;
              if (surveyAsksMessage(rating)) setPending(rating);
              else onAnswer(rating, null);
            }}
          />
        </view>
      ) : (
        <>
          <view data-testid="episode-survey-message">
            <TextField
              id={episodeSurveyMessageInputId}
              label={copy.feedback.survey.messageLabel}
              accessibilityLabel={copy.feedback.survey.messageLabel}
              counter={{ maxLength: feedbackMessageMaxLength }}
              bindinput={setMessage}
              bindkeyboardheightchange={setKeyboardHeight}
            />
          </view>
          <view className="episode-survey-send" data-testid="episode-survey-send">
            <Button
              label={copy.feedback.send}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={() => onAnswer(pending, feedbackMessageOf(message))}
            />
          </view>
        </>
      )}
      {/* 시트의 기본 액션 버튼(m)은 보기 목록 아래에서 너무 작아, 다른 화면의 주 버튼과 같은 xl로 둡니다. */}
      <view className="episode-survey-skip" data-testid="episode-survey-skip">
        <Button
          label={copy.feedback.survey.skip}
          variant="subtle"
          size="xl"
          width="fill"
          bindtap={close}
        />
      </view>
      {pending !== null && keyboardHeight > 0 ? (
        <view
          data-testid="episode-survey-keyboard"
          style={{ height: `${keyboardHeight}px`, flexShrink: 0 }}
        />
      ) : null}
      {keyboardHeight === 0 && tappableBottom > 0 ? (
        <view
          data-testid="episode-survey-inset"
          style={{ height: `${tappableBottom}px`, flexShrink: 0 }}
        />
      ) : null}
    </BottomSheet>
  );
}
