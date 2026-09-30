import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";

import { feedbackRatings } from "../../lib/feedback-api";
import type { FeedbackRating } from "../../lib/feedback.contract";
import { useUiCopy } from "../../lib/ui-copy";

export type EpisodeSurveySheetProps = {
  readonly episodeTitle: string;
  /** 보기를 누르면 곧바로 답이 됩니다(한 번에 끝나는 설문). */
  readonly onAnswer: (rating: FeedbackRating) => void;
  /** `Not now` · 바깥 누름 · 닫기 · 끌어내리기 모두 건너뛰기입니다. */
  readonly onSkip: () => void;
};

// 에피소드를 끝낸 뒤 맵 위에 한 번 뜨는 설문입니다(ADR-0036). 별점 다섯 중 하나를 누르면 끝납니다.
export function EpisodeSurveySheet({
  episodeTitle,
  onAnswer,
  onSkip,
}: EpisodeSurveySheetProps): ReactNode {
  const copy = useUiCopy();
  return (
    <BottomSheet
      title={copy.feedback.survey.title}
      description={copy.feedback.survey.description(episodeTitle)}
      closeAccessibilityLabel={copy.feedback.survey.skip}
      actions={[{ id: "skip", label: copy.feedback.survey.skip, bindtap: onSkip }]}
      ondismiss={onSkip}
    >
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
            if (rating !== undefined) onAnswer(rating);
          }}
        />
      </view>
    </BottomSheet>
  );
}
