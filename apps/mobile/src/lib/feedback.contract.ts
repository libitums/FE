// 사용자 피드백의 어휘입니다(ADR-0036) — 설정의 「Send feedback」, 에피소드 끝 설문, 앱스토어 별점 요청이 씁니다.
// 타입만 둡니다.

/** `general` = 설정에서 보낸 피드백, `episode` = 에피소드 끝 설문의 답. */
export type FeedbackKind = "general" | "episode";

/** 별점입니다. 1이 가장 낮고 5가 가장 높습니다. */
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export type FeedbackSubmission = {
  readonly kind: FeedbackKind;
  readonly rating: FeedbackRating;
  /** 비었거나 공백뿐이면 보내지 않습니다(`null`). */
  readonly message: string | null;
  /** 개인정보를 싣지 않습니다 — 에피소드 ID 같은 맥락만. */
  readonly context: Readonly<Record<string, string>>;
};

export type SubmitFeedbackPath = "/rest/v1/rpc/submit_feedback";

/** 별점 4 이상의 에피소드 설문 뒤 한 번, 호스트 평점 창을 요청합니다(설치당 한 번). */
export type AppReviewRequestedStorageKey = "libitum.app-review.requested";

/** 설문을 답했거나 건너뛴 에피소드 ID 목록(JSON 배열)입니다. 에피소드마다 한 번만 묻습니다. */
export type EpisodeSurveyDoneStorageKey = "libitum.episode-survey.done";

/** 스토어 평점 창의 호스트 모듈입니다(iOS StoreKit · Android Play Review). */
export interface AppReviewModule {
  requestReview(): void;
}

/** 문구표의 피드백 절입니다(`uiCopy.feedback`). */
export type FeedbackCopy = {
  /** 설정 화면 제목이자 설정 이동 항목의 이름입니다. */
  readonly title: string;
  readonly ratingQuestion: string;
  /** 별점 보기의 이름입니다 — 숫자만 낭독되지 않게 뜻을 답니다. */
  readonly ratingOption: Readonly<Record<FeedbackRating, string>>;
  readonly messageLabel: string;
  readonly send: string;
  readonly sent: string;
  readonly failed: string;
  /** 에피소드 끝 설문입니다. */
  readonly survey: {
    readonly title: string;
    readonly description: (episodeTitle: string) => string;
    readonly skip: string;
  };
};
