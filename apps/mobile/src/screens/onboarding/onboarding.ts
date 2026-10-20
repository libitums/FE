// 온보딩 순수 로직을 소유합니다. 화면은 이 결과를 그리기만 합니다.

import type { OnboardingActionLabel, OnboardingCopy, OnboardingStep } from "./onboarding.contract";

export const onboardingSteps: readonly OnboardingStep[] = [0, 1, 2];

// 문구 표는 자리표입니다 — `ui` 테스트가 리터럴을 단언하지 않습니다.
// 본문의 `\n`은 읽기 좋게 의미 단위로 끊은 줄바꿈입니다(2026-09-21 디자인 반영).
// `default`를 두지 않습니다 — 스텝이 늘면 TS2366으로 섭니다.
export function onboardingCopy(step: OnboardingStep): OnboardingCopy {
  switch (step) {
    case 0: {
      // 임시 문구입니다(2026-09-21 디자인 반영) — 확정 문구가 오면 바꿉니다.
      return {
        title: "with",
        titleEmphasis: "Story",
        body: "Follow everyday moments in a story\nand pick up Korean along the way.",
      };
    }
    case 1: {
      // 임시 문구입니다(2026-09-21 디자인 반영) — 확정 문구가 오면 바꿉니다.
      return {
        title: "Practice",
        titleEmphasis: "Korean",
        body: "Practice real conversations and\ncheck what you learned with quick quizzes.",
      };
    }
    case 2: {
      // 임시 문구입니다(2026-09-21 디자인 반영) — 확정 문구가 오면 바꿉니다.
      return {
        title: "Just",
        titleEmphasis: "5 minutes",
        body: "Short daily units fit into your day.\nClear one in just five minutes.",
      };
    }
  }
}

// 마지막 스텝에서 `null`을 돌려줍니다 — union에 빈 값이 없어 「다음이 없다」를
// `null`이 집니다.
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

// 첫 스텝에서 `null`을 돌려줍니다 — 스플래시로 돌아갈 곳이 없어 뒤로가기를 두지
// 않습니다.
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

// 마지막 스텝만 갈립니다 — 나머지는 저장소의 진행 어휘를 잇습니다.
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
