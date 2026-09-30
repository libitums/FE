// 진입 흐름 화면 여섯의 route를 화면으로 옮깁니다 — 스플래시 → 온보딩 → 로그인 →
// 인증 코드 → 언어 고르기 → 여정 입구. `render-learning-screen.tsx` ·
// `render-episode-intro.tsx` · `render-roleplay-screen.tsx`와 같은 갈래입니다.
//
// **묶음의 근거가 파일 크기가 아니라 흐름입니다.** 이 여섯은 앱을 처음 여는 한 흐름이고,
// 그래서 새 진입 화면이 늘 때 어디에 넣을지가 이름만으로 정해집니다. 크기로 자르면
// 다음 사람이 그 자리를 못 찾습니다.
//
// 전이 · 이벤트 · 토큰 저장은 `wiring`의 콜백이 집니다 — 화면은 결과를 그리고 조작을
// 올릴 뿐입니다.

import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

/** 진입 흐름의 route 여섯입니다. `renderScreen`의 `switch`가 이 여섯을 한 자리로 보냅니다. */
export type EntryScreen = Extract<
  Screen,
  {
    name:
      | "splash"
      | "onboarding"
      | "login"
      | "verification-code"
      | "language-select"
      | "journey-entry";
  }
>;

// `default` 없는 `switch`입니다 — 진입 화면이 늘면 반환 경로가 비어 컴파일에 섭니다.
// 바깥 `renderScreen`의 `never` 망라와 같은 형태입니다.
export function renderEntryScreen(screen: EntryScreen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "splash":
      return <SplashScreen onTimeout={wiring.onSplashTimeout} />;
    case "onboarding":
      return <OnboardingScreen onComplete={wiring.onOnboardingComplete} />;
    case "login":
      return (
        <LoginScreen
          phoneSignIn={wiring.phoneSignIn}
          onSelectSocialMethod={wiring.onSelectSocialLoginMethod}
          onSubmitPhoneNumber={wiring.onRequestPhoneOtp}
          onBack={wiring.onLoginBack}
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
    case "language-select":
      return (
        <LanguageSelectScreen
          selected={wiring.entryLanguage}
          onSelect={wiring.onSelectEntryLanguage}
          onContinue={wiring.onContinueLanguageSelect}
          onBack={wiring.onLanguageSelectBack}
        />
      );
    case "journey-entry":
      return (
        <JourneyEntryScreen
          // 이 화면은 셸의 여백을 안 받고 스스로 가장자리를 피합니다(그림이 끝까지
          // 깔려야 합니다 — `isFullBleedScreen`).
          safeArea={wiring.safeAreaInsets}
          language={wiring.entryLanguage}
          onEnter={wiring.onEnterJourney}
          onBack={wiring.onJourneyEntryBack}
        />
      );
  }
}
