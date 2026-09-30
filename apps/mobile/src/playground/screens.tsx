import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { Tab } from "../app/nav-state";
import type {
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
} from "../lib/auth-session.contract";
import type { EntryLanguage } from "../lib/entry-language";
import type { SocialSignInOutcome } from "../lib/social-sign-in.contract";
import { JourneyEntryScreen } from "../screens/journey-entry/JourneyEntryScreen";
import { JourneyMapScreen } from "../screens/journey-map/JourneyMapScreen";
import { LanguageSelectScreen } from "../screens/language-select/LanguageSelectScreen";
import { LoginScreen } from "../screens/login/LoginScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { VerificationCodeScreen } from "../screens/verification-code/VerificationCodeScreen";
import { LearningShell } from "../screens/learning/LearningShell";
import { ListeningScreen } from "../screens/listening/ListeningScreen";
import { initialSessionOptions } from "../lib/session-options";
import { ButtonCatalog } from "./ButtonCatalog";
import { EpisodePrologueScreen } from "../app/EpisodePrologueScreen";
import { tutorialPrologue, tutorialPrologueLabel } from "../app/tutorial-prologue";

// 화면을 앱 흐름 없이 fixture props로 띄웁니다. 콜백은 앱 흐름과 같은 순서로
// playground 안의 다음 화면으로 옮겨 가기만 합니다(저장·이벤트 없음) — 버튼이
// 눌리는지 손으로 확인하는 용도입니다. 화면을 옮겨 올 때마다 한 줄씩 늡니다.
const noop = () => undefined;

// 두 번째 인자는 다음 화면에 넘길 값입니다(지금은 로그인 → 코드 검증의 전화번호뿐).
export type PlaygroundParams = { readonly phoneNumber?: PhoneNumber };
type Go = (screen: PlaygroundScreen, params?: PlaygroundParams) => void;

// playground fixture 전용 자리표시 번호입니다. 코드 검증 화면은 번호가 필수라
// 로그인을 거치지 않고 바로 열어도 값이 있어야 합니다.
const placeholderPhoneNumber: PhoneNumber = { e164: "+821012345678", display: "+82 10 1234 5678" };

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
  "tutorial-prologue": (go: Go) => (
    <EpisodePrologueScreen
      insets={{ top: 62, bottom: 34, left: 0, right: 0 }}
      label={tutorialPrologueLabel}
      prologue={tutorialPrologue}
      onComplete={() => go("journey-map")}
      onExit={() => go("journey-map")}
    />
  ),
  splash: (go: Go) => <SplashScreen onTimeout={() => go("onboarding")} />,
  onboarding: (go: Go) => <OnboardingScreen onComplete={() => go("login")} />,
  login: (go: Go) => (
    <LoginScreen
      // 플레이그라운드는 제품이 숨긴 전화번호 수단도 그립니다 — 코드 검증 화면으로 가는 길입니다.
      phoneSignIn="visible"
      onSelectSocialMethod={() => {
        go("language-select");
        return Promise.resolve<SocialSignInOutcome>({ status: "signed-in" });
      }}
      onSubmitPhoneNumber={(phoneNumber) => {
        // 네트워크 없이 성공을 흉내 냅니다 — 즉시 해소되는 Promise입니다.
        go("verification-code", { phoneNumber });
        return Promise.resolve<PhoneOtpRequestResult>({ status: "sent" });
      }}
      onBack={() => go("onboarding")}
      // 플레이그라운드에는 호스트가 없어 문서를 열지 않습니다.
      onOpenLegalDocument={() => undefined}
    />
  ),
  "verification-code": (go: Go, params: PlaygroundParams) => (
    <VerificationCodeScreen
      phoneNumber={params.phoneNumber ?? placeholderPhoneNumber}
      onVerifyCode={() => {
        go("language-select");
        return Promise.resolve<PhoneOtpVerifyOutcome>({ status: "verified" });
      }}
      onResendCode={() => Promise.resolve<PhoneOtpRequestResult>({ status: "sent" })}
      onExit={() => go("login")}
    />
  ),
  "language-select": (go: Go) => <LanguageSelectFixture go={go} />,
  // 여정 맵은 진행 상태를 App에서 받습니다. 여기서는 스텝 하나를 끝낸 상태로 띄워
  // 완료·현재·잠김 셋이 한 화면에 같이 보이게 합니다.
  //
  // ⚠ **표지를 끝낸 상태로 띄웁니다.** 표지가 미완료면 그 구획의 나머지 아홉이 전부
  // 잠겨(ADR-0024 D6) 완료·현재가 한 줄도 안 보입니다 — 이 놀이터가 보려던 것이
  // 통째로 사라집니다.
  "journey-map": () => (
    <JourneyMapScreen
      completedStepCount={1}
      onStartStep={noop}
      completedEpisodeIntroIds={["tutorial-intro"]}
      onStartEpisodeIntroUnit={noop}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={noop}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={noop}
      completedVisualNovelUnitIds={[]}
      onStartVisualNovelUnit={noop}
      completedEpisodeFinalIds={[]}
      onStartEpisodeFinal={noop}
    />
  ),
  "journey-entry": (go: Go) => (
    <JourneyEntryScreen
      safeArea={{ top: 0, bottom: 0 }}
      language="en"
      onEnter={noop}
      onBack={() => go("language-select")}
    />
  ),
  // 학습 껍데기는 활동이 넣어 주는 것을 그립니다. 여기서는 카드 · 작업 영역에
  // 자리표시를 넣어 뼈대(상단 바 · 세션 헤더 · 지시문 · 카드 · 작업 · 버튼)만 봅니다 —
  // 활동을 옮겨 오기 전에 구조를 눈으로 확인하는 용도입니다.
  // 듣기 활동입니다. 껍데기 안에 실제 활동이 들어간 모습을 봅니다 — 자리표시가 아니라
  // 실물 문항이 카드 안에 섭니다.
  listening: () => (
    <ListeningScreen
      stepId="ordering"
      onExit={noop}
      onFinish={noop}
      sessionOptions={initialSessionOptions}
    />
  ),
  "catalog:learning-shell": () => (
    <LearningShell
      form="listening"
      questionIndex={1}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={noop}
      card={<text className="playground-placeholder">카드 안 — 학습 내용이 여기서 전개됩니다</text>}
      workspace={
        <text className="playground-placeholder">작업 영역 — 고를 낱말이 여기 섭니다</text>
      }
      actionLabel="Check"
      onAction={noop}
      streakDays={3}
    />
  ),
  "catalog:button": () => <ButtonCatalog />,
  // 바텀 네비만 봅니다. 화면 fixture를 비워 두면 바가 화면 아래 끝에 홀로 서므로,
  // 긴 화면에 가려지지 않고 바 자체의 간격·색·선택 시각을 볼 수 있습니다.
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
