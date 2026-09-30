// 에피소드 끝 설문의 결선입니다(ADR-0036) — 답은 서버 피드백 표 · 분석 이벤트로 가고, 별점 4 이상이면 설치당 한 번 iOS
// 평점 창을 요청합니다. 답하거나 건너뛴 에피소드는 기억해 다시 묻지 않습니다. 모두 기다리지 않고 실패를 삼킵니다.

import { markEpisodeSurveyDone, requestAppReviewOnce, submitFeedback } from "../lib/feedback-api";
import type { FeedbackRating } from "../lib/feedback.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";

/** 앱스토어 평점을 청할 만큼 좋았다고 보는 최소 별점입니다. */
export const appReviewMinimumRating: FeedbackRating = 4;

export function episodeSurveyWiring({
  episodeIntroEventSink,
  onClosed,
}: {
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  readonly onClosed: () => void;
}) {
  return {
    onAnswerEpisodeSurvey: (episodeId: string, rating: FeedbackRating): void => {
      markEpisodeSurveyDone(episodeId);
      onClosed();
      episodeIntroEventSink?.({
        name: "episode_survey_answered",
        episodeId,
        rating: String(rating),
      });
      void submitFeedback({ kind: "episode", rating, message: null, context: { episodeId } }).catch(
        () => undefined,
      );
      if (rating >= appReviewMinimumRating) requestAppReviewOnce();
    },
    onSkipEpisodeSurvey: (episodeId: string): void => {
      markEpisodeSurveyDone(episodeId);
      onClosed();
      episodeIntroEventSink?.({ name: "episode_survey_skipped", episodeId });
    },
  };
}
