// 피드백 보내기 · 에피소드 설문 기억 · 앱스토어 평점 창입니다(ADR-0036). 던지지 않습니다.

import type {
  AppReviewModule,
  FeedbackRating,
  AppReviewRequestedStorageKey,
  EpisodeSurveyDoneStorageKey,
  FeedbackSubmission,
} from "./feedback.contract";
import { authorizedRpc } from "./progress-api";
import { getItem, setItem } from "./storage";

export const feedbackRatings: readonly FeedbackRating[] = [1, 2, 3, 4, 5];

/** 설정 피드백의 글 상한입니다(서버는 1000자까지 받습니다). */
export const feedbackMessageMaxLength = 500;

/** 서버에 한 건을 남깁니다. 성공이면 `true`. 로그인이 없거나 실패하면 `false`. */
export async function submitFeedback(submission: FeedbackSubmission): Promise<boolean> {
  const message = submission.message?.trim() ?? "";
  const body = await authorizedRpc("/rest/v1/rpc/submit_feedback", {
    p_kind: submission.kind,
    p_rating: submission.rating,
    p_message: message === "" ? null : message,
    p_context: submission.context,
  });
  return body !== null;
}

export const episodeSurveyDoneStorageKey: EpisodeSurveyDoneStorageKey =
  "libitum.episode-survey.done";
export const appReviewRequestedStorageKey: AppReviewRequestedStorageKey =
  "libitum.app-review.requested";

/** 설문을 끝낸(답했거나 건너뛴) 에피소드 ID 목록입니다. 저장값이 틀리면 빈 목록으로 읽습니다. */
export function loadEpisodeSurveyDone(): readonly string[] {
  try {
    const parsed = JSON.parse(getItem(episodeSurveyDoneStorageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markEpisodeSurveyDone(episodeId: string): void {
  const done = loadEpisodeSurveyDone();
  if (done.includes(episodeId)) return;
  setItem(episodeSurveyDoneStorageKey, JSON.stringify([...done, episodeId]));
}

function appReviewModule(): AppReviewModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["AppReviewModule"] as
    | AppReviewModule
    | undefined;
  return module ?? undefined;
}

/** 설치당 한 번 호스트의 평점 창을 요청합니다. 표시 여부는 각 스토어가 결정합니다. */
export function requestAppReviewOnce(): boolean {
  // Android Lynx의 String 반환은 없는 SharedPreferences 값도 ""로 건넬 수 있습니다.
  if (getItem(appReviewRequestedStorageKey) === "1") return false;
  const host = appReviewModule();
  if (host === undefined || typeof host.requestReview !== "function") return false;
  try {
    host.requestReview();
  } catch {
    return false;
  }
  setItem(appReviewRequestedStorageKey, "1");
  return true;
}
