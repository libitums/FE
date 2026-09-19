// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §2.4(순수 타입 계약) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.
//
// `step`은 `Screen` union의 필드가 아니라 화면 로컬 상태다(LIB-223 선례와 같은
// 판단). 문구 표는 export하지 않는다(`lib/entry-language.ts`와 같은 근거).
//
// LIB-261 (logic-scaffold r0.3): `onboarding-screen-progress`는 보정 r0.3(§0.10
// (3) · §4.5)이 신설한 진행 묶음 래퍼 testid다 — OB-U7이 질의한다.

export type OnboardingStep = 0 | 1 | 2;
export type OnboardingActionLabel = "다음" | "시작하기";
export type OnboardingCopy = { readonly title: string; readonly body: string };
export type OnboardingScreenProps = { readonly onComplete: () => void };

export type OnboardingTestId =
  | "onboarding-screen"
  | "onboarding-screen-scroll"
  | "onboarding-screen-title"
  | "onboarding-screen-body"
  | "onboarding-screen-next"
  | "onboarding-screen-progress"
  | `onboarding-screen-progress-dot-${OnboardingStep}`;
