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

  wiring.onAnswerEpisodeSurvey("tutorial", 4, null);
  expect(markEpisodeSurveyDone).toHaveBeenCalledWith("tutorial");
  expect(onClosed).toHaveBeenCalledTimes(1);
  expect(events).toEqual([
    { name: "episode_survey_answered", episodeId: "tutorial", rating: "4", hasMessage: false },
  ]);
  expect(submitFeedback).toHaveBeenCalledWith({
    kind: "episode",
    rating: 4,
    message: null,
    context: { episodeId: "tutorial" },
  });
  expect(requestAppReviewOnce).toHaveBeenCalledTimes(1);

  wiring.onAnswerEpisodeSurvey("tutorial", 3, null);
  expect(requestAppReviewOnce).toHaveBeenCalledTimes(1);
});

test("[ES3] 낮은 별점 + 글: 서버에 글이 가고 이벤트는 글 유무만 싣는다, 평점 창은 없다", () => {
  const events: unknown[] = [];
  const wiring = episodeSurveyWiring({
    episodeIntroEventSink: (e) => events.push(e),
    onClosed: vi.fn(),
  });

  wiring.onAnswerEpisodeSurvey("u00-tutorial", 2, "Too fast for me.");
  expect(events).toEqual([
    { name: "episode_survey_answered", episodeId: "u00-tutorial", rating: "2", hasMessage: true },
  ]);
  expect(submitFeedback).toHaveBeenCalledWith({
    kind: "episode",
    rating: 2,
    message: "Too fast for me.",
    context: { episodeId: "u00-tutorial" },
  });
  expect(requestAppReviewOnce).not.toHaveBeenCalled();
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
