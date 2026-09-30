// 설정의 「Send feedback」 화면 계약입니다(ADR-0036). 구현 · JSX를 두지 않습니다.

import type { FeedbackRating } from "../../lib/feedback.contract";

export type FeedbackScreenProps = {
  /** 보냅니다. 성공이면 `true` — 화면이 감사 문구로 바뀝니다. 실패면 폼이 그대로 남고 실패 문구가 섭니다. */
  readonly onSubmit: (rating: FeedbackRating, message: string) => Promise<boolean>;
  /** `설정으로` — 설정 탭 스택의 루트로 갑니다. */
  readonly onExit: () => void;
};

export type FeedbackStatus = "editing" | "sending" | "sent" | "failed";

export type FeedbackScreenTestId =
  | "feedback-screen-exit"
  | "feedback-screen-title"
  | "feedback-screen-scroll"
  | "feedback-screen-rating"
  | "feedback-screen-message"
  | "feedback-screen-send"
  | "feedback-screen-sent"
  | "feedback-screen-failed";
