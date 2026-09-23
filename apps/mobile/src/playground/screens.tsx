import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { requiresVerificationCode } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import { ButtonCatalog } from "./ButtonCatalog";

// 화면을 앱 흐름 없이 fixture props로 띄운다. 콜백은 앱 흐름과 같은 순서로 playground 안의
// 다음 화면으로 옮겨 가기만 한다(저장·이벤트 없음) — 버튼이 눌리는지 손으로 확인하는 용도다.
// 화면을 옮겨 올 때마다 한 줄씩 는다.
const noop = () => undefined;

// 두 번째 인자는 다음 화면에 넘길 값이다(지금은 로그인 → 코드 검증의 전화번호뿐).
export type PlaygroundParams = { readonly phoneNumber?: string };
type Go = (screen: PlaygroundScreen, params?: PlaygroundParams) => void;

function LanguageSelectFixture({ go }: { go: Go }): ReactNode {
  const [selected, setSelected] = useState<EntryLanguage>("en");
  return (
    <LanguageSelectScreen
      selected={selected}
      onSelect={setSelected}
      onContinue={() => go("journey-entry")}
      onBack={() => go("login")}
    />
  );
}

export const playgroundScreens = {
  splash: (go: Go) => <SplashScreen onTimeout={() => go("onboarding")} />,
  onboarding: (go: Go) => <OnboardingScreen onComplete={() => go("login")} />,
  login: (go: Go) => (
    <LoginScreen
      onSelectMethod={(method, phoneNumber) =>
        go(requiresVerificationCode(method) ? "verification-code" : "language-select", {
          phoneNumber,
        })
      }
      onBack={() => go("onboarding")}
    />
  ),
  "verification-code": (go: Go, params: PlaygroundParams) => (
    <VerificationCodeScreen
      phoneNumber={params.phoneNumber ?? "+82 10 1234 5678"}
      onSubmit={() => go("language-select")}
      onExit={() => go("login")}
    />
  ),
  "language-select": (go: Go) => <LanguageSelectFixture go={go} />,
  "journey-entry": (go: Go) => (
    <JourneyEntryScreen language="en" onEnter={noop} onBack={() => go("language-select")} />
  ),
  "catalog:button": () => <ButtonCatalog />,
} satisfies Record<string, (go: Go, params: PlaygroundParams) => ReactNode>;

export type PlaygroundScreen = keyof typeof playgroundScreens;
