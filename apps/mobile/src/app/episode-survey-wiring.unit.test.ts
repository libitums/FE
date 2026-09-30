import { beforeEach, expect, test, vi } from "vitest";

const submitFeedback = vi.fn(async () => true);
const markEpisodeSurveyDone = vi.fn();
const requestAppReviewOnce = vi.fn(() => true);
vi.mock("../lib/feedback-api", () => ({
  submitFeedback,
  markEpisodeSurveyDone,
  requestAppReviewOnce,
}));

const { episodeSurveyWiring } = await import("./episode-survey-wiring");

beforeEach(() => {
  submitFeedback.mockClear();
  markEpisodeSurveyDone.mockClear();
  requestAppReviewOnce.mockClear();
});

test("[ES1] 답: 기억 → 닫기 → 이벤트 → 서버 피드백, 별점 4 이상이면 평점 창을 청한다", () => {
  const events: unknown[] = [];
  const onClosed = vi.fn();
  const wiring = episodeSurveyWiring({ episodeIntroEventSink: (e) => events.push(e), onClosed });

  wiring.onAnswerEpisodeSurvey("tutorial", 4);
  expect(markEpisodeSurveyDone).toHaveBeenCalledWith("tutorial");
  expect(onClosed).toHaveBeenCalledTimes(1);
  expect(events).toEqual([{ name: "episode_survey_answered", episodeId: "tutorial", rating: "4" }]);
  expect(submitFeedback).toHaveBeenCalledWith({
    kind: "episode",
    rating: 4,
    message: null,
    context: { episodeId: "tutorial" },
  });
  expect(requestAppReviewOnce).toHaveBeenCalledTimes(1);

  wiring.onAnswerEpisodeSurvey("tutorial", 3);
  expect(requestAppReviewOnce).toHaveBeenCalledTimes(1);
});

test("[ES2] 건너뛰기: 기억 · 닫기 · 이벤트만, 서버 · 평점 창은 없다", () => {
  const events: unknown[] = [];
  const onClosed = vi.fn();
  episodeSurveyWiring({
    episodeIntroEventSink: (e) => events.push(e),
    onClosed,
  }).onSkipEpisodeSurvey("tutorial");
  expect(markEpisodeSurveyDone).toHaveBeenCalledWith("tutorial");
  expect(onClosed).toHaveBeenCalledTimes(1);
  expect(events).toEqual([{ name: "episode_survey_skipped", episodeId: "tutorial" }]);
  expect(submitFeedback).not.toHaveBeenCalled();
  expect(requestAppReviewOnce).not.toHaveBeenCalled();
});
