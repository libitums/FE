// 진입 흐름 화면들의 route를 화면으로 옮깁니다 — 스플래시 → 온보딩 → 로그인 → 인증 코드 → ① 이름 → ② 나라 →
// 언어 고르기 → ④ 출생 연도 → 여정 입구 → (기초부터면) 글자 → 합치기 → 준비 완료(ADR-0176). `render-learning-screen.tsx` ·
// `render-episode-intro.tsx` · `render-roleplay-screen.tsx`와 같은 갈래입니다.
//
// **묶음의 근거가 파일 크기가 아니라 흐름입니다.** 이 화면들은 앱을 처음 여는 한 흐름이고,
// 그래서 새 진입 화면이 늘 때 어디에 넣을지가 이름만으로 정해집니다. 크기로 자르면
// 다음 사람이 그 자리를 못 찾습니다.
//
// 전이 · 이벤트 · 토큰 저장은 `wiring`의 콜백이 집니다 — 화면은 결과를 그리고 조작을
// 올릴 뿐입니다.

import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { EntryBasicsComposeScreen } from "../screens/entry-basics/EntryBasicsComposeScreen";
import { EntryBasicsLettersScreen } from "../screens/entry-basics/EntryBasicsLettersScreen";
import { EntryBasicsReadyScreen } from "../screens/entry-basics/EntryBasicsReadyScreen";
import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { LearnerBirthYearScreen } from "../screens/learner-profile/LearnerBirthYearScreen";
import { LearnerCountryScreen } from "../screens/learner-profile/LearnerCountryScreen";
import { LearnerNameScreen } from "../screens/learner-profile/LearnerNameScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { UpdateRequiredScreen } from "../screens/update-required/UpdateRequiredScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

/** 진입 흐름의 route 열셋입니다. `renderScreen`의 `switch`가 이 열셋을 한 자리로 보냅니다. */
export type EntryScreen = Extract<
  Screen,
  {
    name:
      | "splash"
      | "onboarding"
      | "login"
      | "verification-code"
      | "learner-name"
      | "learner-country"
      | "language-select"
      | "learner-birth-year"
      | "journey-entry"
      | "entry-basics-letters"
      | "entry-basics-compose"
      | "entry-basics-ready"
      | "update-required";
  }
>;

// `default` 없는 `switch`입니다 — 진입 화면이 늘면 반환 경로가 비어 컴파일에 섭니다.
// 바깥 `renderScreen`의 `never` 망라와 같은 형태입니다.
export function renderEntryScreen(screen: EntryScreen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "splash":
      return <SplashScreen onTimeout={wiring.onSplashTimeout} />;
    case "update-required":
      return <UpdateRequiredScreen onUpdate={wiring.onOpenAppStore} />;
    case "onboarding":
      return (
        <OnboardingScreen
          onComplete={wiring.onOnboardingComplete}
          onEvent={wiring.onOnboardingEvent}
        />
      );
    case "login":
      return (
        <LoginScreen
          phoneSignIn={wiring.phoneSignIn}
          visibleMethods={wiring.visibleSocialMethods()}
          unavailableMethods={wiring.unavailableSocialMethods()}
          guestSignIn="visible"
          onContinueAsGuest={wiring.onContinueAsGuest}
          onSelectSocialMethod={wiring.onSelectSocialLoginMethod}
          onSubmitPhoneNumber={wiring.onRequestPhoneOtp}
          onBack={wiring.onLoginBack}
          onOpenLegalDocument={wiring.onOpenLegalDocument}
        />
      );
    case "verification-code":
      return (
        <VerificationCodeScreen
          phoneNumber={screen.phoneNumber}
          onVerifyCode={wiring.onVerifyPhoneOtp}
          onResendCode={wiring.onResendPhoneOtp}
          onExit={wiring.onVerificationCodeExit}
        />
      );
    case "learner-name":
      return (
        <LearnerNameScreen
          initialName={screen.initialName}
          port={wiring.learnerPort}
          onContinue={wiring.onContinueLearnerName}
          onBack={wiring.onLearnerProfileStepBack}
          stepCount={signupStepCount(wiring)}
        />
      );
    case "learner-country":
      return (
        <LearnerCountryScreen
          learnerName={screen.learnerName}
          initialCountryCode={wiring.learnerRecord?.countryCode ?? null}
          port={wiring.learnerPort}
          onContinue={wiring.onContinueLearnerCountry}
          onBack={wiring.onLearnerProfileStepBack}
          stepCount={signupStepCount(wiring)}
        />
      );
    case "language-select":
      return (
        <LanguageSelectScreen
          selected={wiring.entryLanguage}
          onSelect={wiring.onSelectEntryLanguage}
          onContinue={wiring.onContinueLanguageSelect}
          onBack={wiring.onLanguageSelectBack}
          stepCount={signupStepCount(wiring)}
        />
      );
    case "learner-birth-year":
      return (
        <LearnerBirthYearScreen
          onContinue={wiring.onContinueLearnerBirthYear}
          onBack={wiring.onLearnerBirthYearBack}
        />
      );
    case "journey-entry":
      return (
        <JourneyEntryScreen
          // 이 화면은 셸의 여백을 안 받고 스스로 가장자리를 피합니다(그림이 끝까지
          // 깔려야 합니다 — `isFullBleedScreen`).
          safeArea={wiring.safeAreaInsets}
          language={wiring.entryLanguage}
          onSelectPath={wiring.onSelectEntryPath}
          onBack={wiring.onJourneyEntryBack}
        />
      );
    case "entry-basics-letters":
      return (
        <EntryBasicsLettersScreen
          sound={wiring.more.letterSound}
          onNext={() => wiring.onCompleteBasicsStep("letters")}
          onSkip={() => wiring.onSkipBasics("letters")}
          onBack={wiring.onBasicsBack}
        />
      );
    case "entry-basics-compose":
      return (
        <EntryBasicsComposeScreen
          romanization={wiring.more.romanization}
          sound={wiring.more.letterSound}
          autoPlay={wiring.more.autoPlay}
          onNext={() => wiring.onCompleteBasicsStep("compose")}
          onSkip={() => wiring.onSkipBasics("compose")}
          onBack={wiring.onBasicsBack}
        />
      );
    case "entry-basics-ready":
      return (
        <EntryBasicsReadyScreen
          safeArea={wiring.safeAreaInsets}
          planeUrl={tutorialCoverUrlOf(wiring)}
          onNext={() => wiring.onCompleteBasicsStep("ready")}
          onBack={wiring.onBasicsBack}
        />
      );
  }
}

/** 가입 흐름 단계 수 — 비회원은 ④ 출생 연도가 없어 셋입니다(ADR-0059 개정 2026-11-27). */
function signupStepCount(wiring: ScreenWiring): number {
  return wiring.accountState === "guest" ? 3 : 4;
}

/** 준비 완료의 비행기 — 지도의 튜토리얼 표지와 같은 그림 · 같은 주소 해석입니다(새 바이트 0). */
function tutorialCoverUrlOf(wiring: ScreenWiring): string | null {
  for (const section of wiring.catalogSections) {
    if (section.kind !== "catalog-ready" || section.episodeId !== TUTORIAL_EPISODE_ID) continue;
    return section.cover === undefined ? null : wiring.episodeContent.imageUrlOf(section.cover);
  }
  return null;
}

/**
 * 비회원이 설정에서 여는 로그인 화면입니다(ADR-0111). 비회원 버튼이 없고, 전화번호 수단은 고정으로 숨깁니다 —
 * 코드 검증 route는 진입 스택 전용 전이를 타서 설정 스택에서는 열지 않습니다.
 */
export function renderGuestLoginScreen(wiring: ScreenWiring) {
  return (
    <LoginScreen
      phoneSignIn="hidden"
      visibleMethods={wiring.visibleSocialMethods()}
      unavailableMethods={wiring.unavailableSocialMethods()}
      guestSignIn="hidden"
      onSelectSocialMethod={wiring.onSelectGuestSignInMethod}
      onSubmitPhoneNumber={wiring.onRequestPhoneOtp}
      onContinueAsGuest={noop}
      onBack={wiring.onGuestSignInBack}
      onOpenLegalDocument={wiring.onOpenLegalDocument}
    />
  );
}

const noop = (): void => undefined;
