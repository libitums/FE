import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { Tab } from "../app/nav-state";
import { requiresVerificationCode } from "../lib/entry-flow";
import type { EntryLanguage } from "../lib/entry-language";
import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";

import { ButtonCatalog } from "./ButtonCatalog";

// 화면을 앱 흐름 없이 fixture props로 띄웁니다. 콜백은 앱 흐름과 같은 순서로
// playground 안의 다음 화면으로 옮겨 가기만 합니다(저장·이벤트 없음) — 버튼이
// 눌리는지 손으로 확인하는 용도입니다. 화면을 옮겨 올 때마다 한 줄씩 늡니다.
const noop = () => undefined;

// 두 번째 인자는 다음 화면에 넘길 값입니다(지금은 로그인 → 코드 검증의 전화번호뿐).
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
  // 여정 맵은 진행 상태를 App에서 받습니다. 여기서는 스텝 하나를 끝낸 상태로 띄워
  // 완료·현재·잠김 셋이 한 화면에 같이 보이게 합니다.
  "journey-map": () => (
    <JourneyMapScreen
      completedStepCount={1}
      onStartStep={noop}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={noop}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={noop}
      onOpenNotifications={noop}
    />
  ),
  "journey-entry": (go: Go) => (
    <JourneyEntryScreen language="en" onEnter={noop} onBack={() => go("language-select")} />
  ),
  "catalog:button": () => <ButtonCatalog />,
  // 바텀 네비만 봅니다. 화면 fixture를 비워 두면 바가 화면 아래 끝에 홀로 서므로,
  // 긴 화면에 가려지지 않고 바 자체의 간격·색·선택 시각을 볼 수 있습니다.
  // 에피소드 헤더만 봅니다. 여정 맵에 붙이기 전에 카드 · 타이포 · 진행 막대를 따로
  // 확인하는 자리입니다 — 0%와 중간과 100%를 한 화면에 세웁니다.
  "catalog:episode-header": () => (
    <view
      style={{ flex: "1", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <EpisodeHeader
        episodeLabel="Episode 0."
        title="Tutorial."
        completedUnitCount={0}
        totalUnitCount={8}
      />
      <EpisodeHeader
        episodeLabel="Episode 1."
        title="Cosmetic."
        completedUnitCount={7}
        totalUnitCount={20}
      />
      <EpisodeHeader
        episodeLabel="Episode 2."
        title="한글 이름도 봅니다"
        completedUnitCount={8}
        totalUnitCount={8}
      />
    </view>
  ),
  "catalog:bottom-navigator": () => (
    // 배경색을 셸과 다르게 둡니다. 바 배경이 화면 배경과 같은 색이라 경계·라운드가
    // 보이지 않아, 색을 갈라 두지 않으면 바 모양을 눈으로 확인할 수 없습니다.
    <view style={{ flex: "1", background: "#3B6EA5" }} />
  ),
} satisfies Record<string, (go: Go, params: PlaygroundParams) => ReactNode>;

export type PlaygroundScreen = keyof typeof playgroundScreens;

// 바텀 네비는 App 셸이 렌더하므로 화면 fixture만으로는 안 보입니다. 여기서 화면과
// 탭을 이어 두면 playground도 같은 자리에 바를 세워, 바 디자인을 HMR로 고칠 수
// 있습니다. 진입 구간 화면은 여기 없습니다 — 앱에서도 바가 서지 않습니다.
export const playgroundTabs: Partial<Record<PlaygroundScreen, Tab>> = {
  "journey-map": "journey",
  "catalog:bottom-navigator": "journey",
};
