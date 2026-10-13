// `step`은 `Screen` union의 필드가 아니라 화면 로컬 상태입니다 — 온보딩 전이는
// 라우팅에 영향을 주지 않습니다. 문구 표도 export하지 않습니다 — `lib/entry-language.ts`와
// 같은 이유로 화면 로컬에 둡니다.

import type {
  LearnerProfileOutcome,
  LearnerProfilePort,
  LearnerProfileRecord,
} from "../../lib/learner-profile.contract";

export type OnboardingStep = 0 | 1 | 2 | 3;
export type OnboardingActionLabel = "Next" | "Get started";
// `titleEmphasis`가 있으면 제목 뒤에 한 칸 띄워 강조색으로 잇습니다("with" + "Story").
export type OnboardingCopy = {
  readonly title: string;
  readonly titleEmphasis?: string;
  readonly body: string;
};
export type OnboardingScreenProps = {
  readonly onComplete: (outcome: LearnerProfileOutcome) => void;
  /** 마지막 스텝의 양식에 미리 설 값입니다(로그인에서 돌아온 경우의 손님 값). */
  readonly learnerRecord: LearnerProfileRecord | null;
  readonly learnerPort: LearnerProfilePort;
};

export type OnboardingTestId =
  | "onboarding-screen"
  | "onboarding-screen-scroll"
  | "onboarding-screen-title"
  | "onboarding-screen-body"
  | "onboarding-screen-next"
  | "onboarding-screen-progress"
  | "onboarding-screen-cards"
  | "onboarding-screen-header"
  | "onboarding-screen-hero"
  | "onboarding-screen-chat"
  | "onboarding-screen-stack"
  | "onboarding-screen-unit"
  | "onboarding-screen-profile";
