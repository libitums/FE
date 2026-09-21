import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { EntryLanguage } from "../lib/entry-language";
import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import { ButtonCatalog } from "./ButtonCatalog";

// 화면을 앱 흐름 없이 fixture props로 띄운다. 콜백은 아무것도 하지 않는다 —
// 여기서 보는 것은 시각이지 전이가 아니다. 화면을 옮겨 올 때마다 한 줄씩 는다.
const noop = () => undefined;

function LanguageSelectFixture(): ReactNode {
  const [selected, setSelected] = useState<EntryLanguage>("ko");
  return <LanguageSelectScreen selected={selected} onSelect={setSelected} onContinue={noop} />;
}

export const playgroundScreens = {
  splash: () => <SplashScreen onTimeout={noop} />,
  onboarding: () => <OnboardingScreen onComplete={noop} />,
  login: () => <LoginScreen onSelectMethod={noop} />,
  "verification-code": () => <VerificationCodeScreen onSubmit={noop} onExit={noop} />,
  "language-select": () => <LanguageSelectFixture />,
  "journey-entry": () => <JourneyEntryScreen language="ko" onEnter={noop} />,
  "catalog:button": () => <ButtonCatalog />,
} satisfies Record<string, () => ReactNode>;

export type PlaygroundScreen = keyof typeof playgroundScreens;
