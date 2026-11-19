import type { OnboardingEvent, OnboardingStepVia } from "../../lib/entry-flow";

export type { OnboardingStepVia };

// `step`은 `Screen` union의 필드가 아니라 화면 로컬 상태입니다 — 온보딩 전이는
// 라우팅에 영향을 주지 않습니다. 문구는 UI 문구표의 `onboarding` 구획이 집니다(ADR-0091).

export type OnboardingStep = 0 | 1 | 2;
// `titleEmphasis`가 있으면 제목 뒤에 한 칸 띄워 강조색으로 잇습니다("with" + "Story").
export type OnboardingCopy = {
  readonly title: string;
  readonly titleEmphasis?: string;
  readonly body: string;
};

/**
 * 온보딩 화면의 UI 문구 구획입니다(`UiCopy.onboarding`). 카드 속 한국어 대사는 학습
 * 콘텐츠라 여기 두지 않고, 그 번역 줄만 UI 언어를 따릅니다.
 */
export type OnboardingScreenCopy = {
  readonly steps: Readonly<Record<OnboardingStep, OnboardingCopy>>;
  /** 모든 스텝 아래의 버튼입니다 — 누르면 곧바로 로그인으로 갑니다(ADR-0159). */
  readonly getStarted: string;
  /** 진행 점의 접근성 이름 — `Step 1 of 3`. */
  readonly progress: (ordinal: number, total: number) => string;
  /** 첫 스텝 대화 카드 — 상대(도윤) 화자 이름과 대사 셋의 번역 줄입니다(나 화자는 `common.me`). */
  readonly storyChat: {
    readonly friend: string;
    readonly atStore: string;
    readonly water: string;
    readonly onMyWay: string;
  };
  /** 둘째 스텝 듣기 카드의 버튼 이름입니다(정답 배지는 `common.answerResult`). */
  readonly quiz: { readonly replay: string; readonly stop: string; readonly play: string };
  /** 셋째 스텝 학습 유닛 카드입니다. */
  readonly unit: {
    readonly title: string;
    readonly meta: string;
    readonly status: Readonly<Record<"active" | "clear", string>>;
  };
};
// 온보딩은 기능을 맛보는 카드 셋뿐입니다 — 이름 · 나라는 가입 직후 화면이 묻습니다(ADR-0059 D7 2026-10-20).
/** 스텝을 넘기는 손가락 위치입니다(`pageX` · `pageY`). */
export type OnboardingSwipePoint = { readonly x: number; readonly y: number };

export type OnboardingScreenProps = {
  readonly onComplete: () => void;
  /** 스텝 열람 · 시작 이벤트를 받습니다(진입 sink). 없으면 내지 않습니다. */
  readonly onEvent?: (event: OnboardingEvent) => void;
};

export type OnboardingTestId =
  | "onboarding-screen"
  | "onboarding-screen-scroll"
  | "onboarding-screen-title"
  | "onboarding-screen-body"
  | "onboarding-screen-start"
  | "onboarding-screen-pager"
  | "onboarding-screen-stage"
  | "onboarding-screen-progress"
  | "onboarding-screen-cards"
  | "onboarding-screen-header"
  | "onboarding-screen-hero"
  | "onboarding-screen-chat"
  | "onboarding-screen-stack"
  | "onboarding-screen-unit";

/** 높이를 재는 두 요소의 id입니다 — 스크롤 영역과 페이지 표시 · 제목 · 본문 묶음(카드 영역 높이의 입력). */
export const onboardingScrollId = "onboarding-screen-scroll";
export const onboardingTextId = "onboarding-screen-text";
