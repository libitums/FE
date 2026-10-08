import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";

import { feedbackRatings } from "../../lib/feedback-api";
import type { FeedbackRating } from "../../lib/feedback.contract";
import { tappableBottomInsetFrom } from "../../lib/safe-area";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";

import "./episode-survey-sheet.css";

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
  // 패널 아래 여백의 `env(safe-area-inset-bottom)`은 이 호스트에서 0으로 풀려, Android 3버튼 바가
  // 건너뛰기 버튼의 아래쪽을 가립니다. 터치를 가로채는 높이만큼 시트가 스스로 비웁니다(iOS · 제스처는 0).
  const tappableBottom = tappableBottomInsetFrom(useGlobalProps());
  // 시스템 뒤로가기 = 닫는 길 넷과 같은 건너뛰기입니다. 설문이 서 있는 동안만 등록됩니다.
  useLayerBack(onSkip);
  return (
    <BottomSheet
      title={copy.feedback.survey.title}
      description={copy.feedback.survey.description(episodeTitle)}
      closeAccessibilityLabel={copy.feedback.survey.skip}
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
      {/* 시트의 기본 액션 버튼(m)은 보기 목록 아래에서 너무 작아, 다른 화면의 주 버튼과 같은 xl로 둡니다. */}
      <view className="episode-survey-skip" data-testid="episode-survey-skip">
        <Button
          label={copy.feedback.survey.skip}
          variant="subtle"
          size="xl"
          width="fill"
          bindtap={onSkip}
        />
      </view>
      {tappableBottom > 0 ? (
        <view
          data-testid="episode-survey-inset"
          style={{ height: `${tappableBottom}px`, flexShrink: 0 }}
        />
      ) : null}
    </BottomSheet>
  );
}
