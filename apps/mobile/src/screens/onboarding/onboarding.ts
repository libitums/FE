// 온보딩 순수 로직 (LIB-261 계약 §2.4). 화면은 이 결과를 그리기만 한다.
//
// LIB-261 (logic): 시그니처는 계약 최종본이다. 값·본문도 이 단계가 계약 §0.3 D-b·
// §8의 스텝별 문구·순서로 채운다.

import type { OnboardingActionLabel, OnboardingCopy, OnboardingStep } from "./onboarding.contract";

export const onboardingSteps: readonly OnboardingStep[] = [0, 1, 2];

// 문구 표는 자리표다(계약 §0.3 D-b) — `ui` 테스트가 리터럴을 단언하지 않는다.
// 본문의 `\n`은 읽기 좋게 의미 단위로 끊은 줄바꿈이다(2026-09-21 디자인 반영).
// `default` 없는 switch — 스텝이 늘면 TS2366으로 선다.
export function onboardingCopy(step: OnboardingStep): OnboardingCopy {
  switch (step) {
    case 0: {
      // 임시 문구(2026-09-21 디자인 반영) — 확정 문구가 오면 바꾼다.
      return {
        title: "with",
        titleEmphasis: "Story",
        body: "Follow everyday moments in a story\nand pick up Korean along the way.",
      };
    }
    case 1: {
      // 임시 문구(2026-09-21 디자인 반영) — 확정 문구가 오면 바꾼다.
      return {
        title: "Practice",
        titleEmphasis: "Korean",
        body: "Practice real conversations and\ncheck what you learned with quick quizzes.",
      };
    }
    case 2: {
      // 임시 문구(2026-09-21 디자인 반영) — 확정 문구가 오면 바꾼다.
      return {
        title: "Just",
        titleEmphasis: "5 minutes",
        body: "Short daily units fit into your day.\nClear one in just five minutes.",
      };
    }
  }
}

// 마지막 스텝에서 `null`을 돌려준다 — union에 빈 값이 없어 "다음이 없다"를 `null`이 진다.
export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  switch (step) {
    case 0: {
      return 1;
    }
    case 1: {
      return 2;
    }
    case 2: {
      return null;
    }
  }
}

// 첫 스텝에서 `null`을 돌려준다 — 스플래시로 돌아갈 곳이 없어 뒤로가기를 두지 않는다.
export function previousOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  switch (step) {
    case 0: {
      return null;
    }
    case 1: {
      return 0;
    }
    case 2: {
      return 1;
    }
  }
}

// 마지막 스텝만 갈린다(계약 §8) — 나머지는 저장소의 진행 어휘를 잇는다.
export function onboardingActionLabel(step: OnboardingStep): OnboardingActionLabel {
  switch (step) {
    case 0:
    case 1: {
      return "Next";
    }
    case 2: {
      return "Get started";
    }
  }
}
