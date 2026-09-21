// 온보딩 순수 로직 (LIB-261 계약 §2.4). 화면은 이 결과를 그리기만 한다.
//
// LIB-261 (logic): 시그니처는 계약 최종본이다. 값·본문도 이 단계가 계약 §0.3 D-b·
// §8의 스텝별 문구·순서로 채운다.

import type { OnboardingActionLabel, OnboardingCopy, OnboardingStep } from "./onboarding.contract";

export const onboardingSteps: readonly OnboardingStep[] = [0, 1, 2];

// 문구 표는 자리표다(계약 §0.3 D-b) — `ui` 테스트가 리터럴을 단언하지 않는다.
// `default` 없는 switch — 스텝이 늘면 TS2366으로 선다.
export function onboardingCopy(step: OnboardingStep): OnboardingCopy {
  switch (step) {
    case 0: {
      return {
        title: "서사로 배우는 한국어",
        body: "이야기 속 상황을 따라가며 한국어를 익힙니다.",
      };
    }
    case 1: {
      return {
        title: "여정으로 이어지는 학습",
        body: "스텝을 하나씩 지나며 이야기가 이어집니다.",
      };
    }
    case 2: {
      return {
        title: "듣고 고르며 확인하기",
        body: "배운 것을 문항으로 바로 확인합니다.",
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

// 마지막 스텝만 갈린다(계약 §8) — 나머지는 저장소의 진행 어휘를 잇는다.
export function onboardingActionLabel(step: OnboardingStep): OnboardingActionLabel {
  switch (step) {
    case 0:
    case 1: {
      return "다음";
    }
    case 2: {
      return "시작하기";
    }
  }
}
