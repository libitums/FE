// 에피소드 끝 설문의 결선입니다(ADR-0036) — 답은 서버 피드백 표 · 분석 이벤트로 가고, 별점 4 이상이면 설치당 한 번 호스트
// 평점 창을 요청합니다. 답하거나 건너뛴 에피소드는 기억해 다시 묻지 않습니다. 모두 기다리지 않고 실패를 삼킵니다.

import {
  feedbackReasonsOf,
  markEpisodeSurveyDone,
  requestAppReviewOnce,
  submitFeedback,
} from "../lib/feedback-api";
import type { FeedbackRating, FeedbackReason } from "../lib/feedback.contract";
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
    /**
     * `reasons`는 1~3점 이유 체크리스트에서 고른 항목(표시 순서, 4 · 5점이면 빈 목록), `message`는 「Other」와 함께 보낸
     * 글입니다(없으면 `null`). 서버 · 이벤트에는 이유를 쉼표로 이어 싣고, 이벤트에는 글 유무만 싣습니다.
     */
    onAnswerEpisodeSurvey: (
      episodeId: string,
      rating: FeedbackRating,
      reasons: readonly FeedbackReason[],
      message: string | null,
    ): void => {
      // 이 문자열이 집계 키라 경계에서 한 번 더 표시 순서 · 중복 없음으로 맞춥니다(리뷰 S1).
      const joined = feedbackReasonsOf(reasons).join(",");
      markEpisodeSurveyDone(episodeId);
      onClosed();
      episodeIntroEventSink?.({
        name: "episode_survey_answered",
        episodeId,
        rating: String(rating),
        reasons: joined,
        hasMessage: message !== null,
      });
      void submitFeedback({
        kind: "episode",
        rating,
        message,
        context: joined === "" ? { episodeId } : { episodeId, reasons: joined },
      }).catch(() => undefined);
      if (rating >= appReviewMinimumRating) requestAppReviewOnce();
    },
    onSkipEpisodeSurvey: (episodeId: string): void => {
      markEpisodeSurveyDone(episodeId);
      onClosed();
      episodeIntroEventSink?.({ name: "episode_survey_skipped", episodeId });
    },
  };
}
